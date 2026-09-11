import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { partners } from '../../../database/schema';
import type { SectionPermission } from '../../../shared/permissions';
import { formatPartnerDisplayName } from '../../partners/domain/partner-procurement-flags';
import { canPatchElaboration } from '../domain/purchase-request.policy';
import {
  calculateMarketNmcd,
  deviationFromExpertPercent,
  kopecksToAmount,
  netFromGrossKopecks,
  pickBestQuoteIds,
  priceToKopecks,
} from '../domain/purchase-quote.nmcd';
import { isQuoteExpiring, moscowDateIso, remainingWorkingDays } from '../domain/purchase-quote.workdays';
import type { FixPurchasePriceDto, SelectPurchaseSupplierDto } from '../dto/purchase-nmcd.dto';
import {
  purchaseQuotePaymentTerms,
  purchaseQuotes,
  purchaseRequestEvents,
  purchaseRequests,
  purchaseRequestSelectionReasons,
  refPurchaseSelectionReasons,
  refVatRates,
  type NmcdSnapshot,
  type NmcdSnapshotQuote,
  type PriceSnapshot,
  type PurchaseRequestEventPayload,
  type SelectionSnapshot,
} from '../procurement-requests.schema';
import { toIsoSafe } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

type QuoteTerm = {
  line_no: number;
  share: string;
  payment_type: string;
  days: number | null;
  day_kind: string | null;
  base_event: string | null;
};

export type ComparisonQuote = {
  quote_id: string;
  partner_id: string;
  partner_name: string;
  price: string;
  net_price: string;
  vat_percent: string | null;
  delivery_days: number | null;
  warranty_months: number | null;
  payment_terms: QuoteTerm[];
  valid_until: string | null;
  excluded_from_nmcd: boolean;
  deviation_from_expert: string | null;
  working_days_left: number | null;
  is_expiring: boolean;
};

export type MarketPreview = {
  ok: boolean;
  code?: 'too_few_quotes' | 'too_few_after_filter';
  average_before: string | null;
  average_after: string | null;
  included_quote_ids: string[];
  excluded: { quote_id: string; deviation: string }[];
};

export type PurchaseComparison = {
  expert_price: string | null;
  currency_code: string;
  vat_included: boolean;
  quotes: ComparisonQuote[];
  best: { price: string | null; delivery: string | null; warranty: string | null };
  market_preview: MarketPreview;
  price_method: string | null;
  price_method_note: string | null;
  initial_max_price: string | null;
  nmcd_snapshot: NmcdSnapshot | null;
  selected_quote_id: string | null;
  selection_note: string | null;
  reason_codes: string[];
  request_updated_at: string;
};

@Injectable()
export class PurchaseNmcdService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: PurchaseRequestsService,
  ) {}

  async listSelectionReasons() {
    const rows = await this.db.db
      .select({
        code: refPurchaseSelectionReasons.code,
        name: refPurchaseSelectionReasons.name,
      })
      .from(refPurchaseSelectionReasons)
      .where(eq(refPurchaseSelectionReasons.isActive, true))
      .orderBy(asc(refPurchaseSelectionReasons.sortOrder), asc(refPurchaseSelectionReasons.code));
    return { data: rows };
  }

  async getComparison(requestId: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.requests.assertCanView(requestId, actorId, permissions);
    const request = await this.loadRequest(requestId);
    const quotes = await this.loadQuotes(requestId);
    const today = moscowDateIso();
    const expertK = request.expertPrice != null ? priceToKopecks(Number(request.expertPrice)) : 0;
    const compareGross = request.vatIncluded;

    const comparisonQuotes: ComparisonQuote[] = quotes.map(quote => {
      const grossK = priceToKopecks(Number(quote.price));
      const vat = quote.vatRate != null ? Number(quote.vatRate) : null;
      const netK = netFromGrossKopecks(grossK, vat);
      const compareK = compareGross ? grossK : netK;
      return {
        quote_id: quote.id,
        partner_id: quote.partnerId,
        partner_name: formatPartnerDisplayName(quote.partnerShortName, quote.partnerName),
        price: String(quote.price),
        net_price: kopecksToAmount(netK),
        vat_percent: quote.vatRate,
        delivery_days: quote.deliveryDays,
        warranty_months: quote.warrantyMonths,
        payment_terms: quote.payment_terms,
        valid_until: quote.validUntil,
        excluded_from_nmcd: quote.excludedFromNmcd,
        deviation_from_expert: expertK > 0 ? deviationFromExpertPercent(compareK, expertK) : null,
        working_days_left: quote.validUntil ? remainingWorkingDays(today, quote.validUntil) : null,
        is_expiring: isQuoteExpiring(quote.validUntil, today),
      };
    });

    const marketInputs = comparisonQuotes.map(quote => ({
      quote_id: quote.quote_id,
      net_kopecks: priceToKopecks(Number(quote.net_price)),
    }));
    const market = calculateMarketNmcd(marketInputs);

    return {
      expert_price: request.expertPrice,
      currency_code: request.currencyCode,
      vat_included: request.vatIncluded,
      quotes: comparisonQuotes,
      best: pickBestQuoteIds(
        comparisonQuotes.map(quote => ({
          quote_id: quote.quote_id,
          net_kopecks: priceToKopecks(Number(quote.net_price)),
          delivery_days: quote.delivery_days,
          warranty_months: quote.warranty_months,
        })),
      ),
      market_preview: toMarketPreview(market),
      price_method: request.priceMethod,
      price_method_note: request.priceMethodNote,
      initial_max_price: request.initialMaxPrice,
      nmcd_snapshot: request.nmcdSnapshot,
      selected_quote_id: request.selectedQuoteId,
      selection_note: request.selectionNote,
      reason_codes: await this.loadReasonCodes(requestId),
      request_updated_at: toIsoSafe(request.updatedAt),
    } satisfies PurchaseComparison;
  }

  async fixPrice(requestId: string, dto: FixPurchasePriceDto, actorId: string) {
    const existing = await this.loadWritable(requestId, actorId);
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const quotes = await this.loadQuotes(requestId);
    const note = dto.note?.trim() || null;
    let snapshot: NmcdSnapshot;
    let amount: string | null;
    const excludedIds = new Set<string>();

    if (dto.method === 'market') {
      const result = calculateMarketNmcd(
        quotes.map(quote => ({
          quote_id: quote.id,
          net_kopecks: netKopecksOf(quote),
        })),
      );
      if (!result.ok) {
        throw new UnprocessableEntityException(marketFailMessage(result.code));
      }
      for (const row of result.excluded) excludedIds.add(row.quote_id);
      amount = kopecksToAmount(result.average_after);
      snapshot = {
        method: dto.method,
        amount,
        note,
        average_before: kopecksToAmount(result.average_before),
        average_after: amount,
        included: quotes
          .filter(quote => !excludedIds.has(quote.id))
          .map(quote => toSnapshotQuote(quote)),
        excluded: result.excluded.map(row => {
          const quote = quotes.find(item => item.id === row.quote_id);
          return quote
            ? { ...toSnapshotQuote(quote), deviation: row.deviation_percent }
            : {
                quote_id: row.quote_id,
                partner_name: null,
                gross: kopecksToAmount(row.net_kopecks),
                net: kopecksToAmount(row.net_kopecks),
                vat_percent: null,
                deviation: row.deviation_percent,
              };
        }),
      };
    } else if (dto.method === 'impossible') {
      if (!note) {
        throw new BadRequestException({ message: 'Укажите пояснение', fields: ['note'] });
      }
      amount = null;
      snapshot = emptySnapshot(dto.method, null, note);
    } else {
      if (dto.amount == null) {
        throw new BadRequestException({ message: 'Укажите сумму НМЦД', fields: ['amount'] });
      }
      amount = Number(dto.amount).toFixed(2);
      snapshot = emptySnapshot(dto.method, amount, note);
    }

    await this.db.db.transaction(async tx => {
      await tx
        .update(purchaseQuotes)
        .set({ excludedFromNmcd: false })
        .where(eq(purchaseQuotes.requestId, requestId));
      const excludedList = [...excludedIds];
      if (excludedList.length > 0) {
        await tx
          .update(purchaseQuotes)
          .set({ excludedFromNmcd: true })
          .where(inArray(purchaseQuotes.id, excludedList));
      }
      await tx
        .update(purchaseRequests)
        .set({
          priceMethod: dto.method,
          priceMethodNote: note,
          initialMaxPrice: amount,
          nmcdSnapshot: snapshot,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, requestId));
      await insertNmcdEvent(tx, {
        requestId,
        action: 'price_fixed',
        payload: {
          to: {
            method: dto.method,
            amount,
            excluded_count: excludedIds.size,
          } satisfies PriceSnapshot,
        },
        actorId,
      });
    });

    return this.requests.getById(requestId);
  }

  async selectSupplier(requestId: string, dto: SelectPurchaseSupplierDto, actorId: string) {
    const existing = await this.loadWritable(requestId, actorId);
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const codes = [...new Set(dto.reason_codes.map(code => code.trim()).filter(Boolean))];
    if (codes.length === 0) {
      throw new BadRequestException({ message: 'Укажите хотя бы одну причину выбора', fields: ['reason_codes'] });
    }

    const catalog = await this.db.db
      .select({ code: refPurchaseSelectionReasons.code })
      .from(refPurchaseSelectionReasons)
      .where(
        and(eq(refPurchaseSelectionReasons.isActive, true), inArray(refPurchaseSelectionReasons.code, codes)),
      );
    if (catalog.length !== codes.length) {
      throw new BadRequestException({ message: 'Неизвестная причина выбора', fields: ['reason_codes'] });
    }

    const [quote] = await this.db.db
      .select({
        id: purchaseQuotes.id,
        partnerId: purchaseQuotes.partnerId,
        partnerName: partners.name,
        partnerShortName: partners.shortName,
      })
      .from(purchaseQuotes)
      .innerJoin(partners, eq(partners.id, purchaseQuotes.partnerId))
      .where(and(eq(purchaseQuotes.id, dto.quote_id), eq(purchaseQuotes.requestId, requestId)))
      .limit(1);
    if (!quote) {
      throw new BadRequestException({ message: 'КП не относится к этому запросу', fields: ['quote_id'] });
    }

    const note = dto.note?.trim() || null;
    const partnerName = formatPartnerDisplayName(quote.partnerShortName, quote.partnerName);
    const toSnap: SelectionSnapshot = {
      quote_id: quote.id,
      partner_id: quote.partnerId,
      partner_name: partnerName,
      reason_codes: codes,
    };

    await this.db.db.transaction(async tx => {
      await tx
        .delete(purchaseRequestSelectionReasons)
        .where(eq(purchaseRequestSelectionReasons.requestId, requestId));
      await tx.insert(purchaseRequestSelectionReasons).values(
        codes.map(code => ({ requestId, reasonCode: code })),
      );
      await tx
        .update(purchaseRequests)
        .set({
          selectedQuoteId: quote.id,
          selectionNote: note,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, requestId));
      await insertNmcdEvent(tx, {
        requestId,
        action: 'supplier_selected',
        payload: { to: toSnap },
        actorId,
      });
    });

    return this.requests.getById(requestId);
  }

  private async loadWritable(requestId: string, actorId: string) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        leadManagerId: purchaseRequests.leadManagerId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .limit(1);
    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    if (
      !canPatchElaboration({
        status: existing.status,
        leadManagerId: existing.leadManagerId,
        actorId,
      })
    ) {
      throw new ForbiddenException('НМЦД и выбор поставщика может сохранить только назначенный ведущий ОУП');
    }
    return existing;
  }

  private async loadRequest(requestId: string) {
    const [row] = await this.db.db
      .select({
        expertPrice: purchaseRequests.expertPrice,
        currencyCode: purchaseRequests.currencyCode,
        vatIncluded: purchaseRequests.vatIncluded,
        priceMethod: purchaseRequests.priceMethod,
        priceMethodNote: purchaseRequests.priceMethodNote,
        initialMaxPrice: purchaseRequests.initialMaxPrice,
        nmcdSnapshot: purchaseRequests.nmcdSnapshot,
        selectedQuoteId: purchaseRequests.selectedQuoteId,
        selectionNote: purchaseRequests.selectionNote,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .limit(1);
    if (!row) throw new NotFoundException('Запрос на закупку не найден');
    return row;
  }

  private async loadReasonCodes(requestId: string): Promise<string[]> {
    const rows = await this.db.db
      .select({ code: purchaseRequestSelectionReasons.reasonCode })
      .from(purchaseRequestSelectionReasons)
      .where(eq(purchaseRequestSelectionReasons.requestId, requestId));
    return rows.map(row => row.code);
  }

  private async loadQuotes(requestId: string) {
    const headers = await this.db.db
      .select({
        id: purchaseQuotes.id,
        partnerId: purchaseQuotes.partnerId,
        price: purchaseQuotes.price,
        vatRateId: purchaseQuotes.vatRateId,
        vatRate: refVatRates.rate,
        deliveryDays: purchaseQuotes.deliveryDays,
        warrantyMonths: purchaseQuotes.warrantyMonths,
        validUntil: purchaseQuotes.validUntil,
        excludedFromNmcd: purchaseQuotes.excludedFromNmcd,
        partnerName: partners.name,
        partnerShortName: partners.shortName,
      })
      .from(purchaseQuotes)
      .innerJoin(partners, eq(partners.id, purchaseQuotes.partnerId))
      .leftJoin(refVatRates, eq(refVatRates.id, purchaseQuotes.vatRateId))
      .where(eq(purchaseQuotes.requestId, requestId))
      .orderBy(asc(purchaseQuotes.createdAt));

    const termsByQuote = new Map<string, QuoteTerm[]>();
    if (headers.length > 0) {
      const termRows = await this.db.db
        .select()
        .from(purchaseQuotePaymentTerms)
        .where(
          inArray(
            purchaseQuotePaymentTerms.quoteId,
            headers.map(row => row.id),
          ),
        )
        .orderBy(asc(purchaseQuotePaymentTerms.lineNo));
      for (const row of termRows) {
        const list = termsByQuote.get(row.quoteId) ?? [];
        list.push({
          line_no: row.lineNo,
          share: String(row.share),
          payment_type: row.paymentType,
          days: row.days,
          day_kind: row.dayKind,
          base_event: row.baseEvent,
        });
        termsByQuote.set(row.quoteId, list);
      }
    }

    return headers.map(row => ({
      ...row,
      payment_terms: termsByQuote.get(row.id) ?? [],
    }));
  }
}

type LoadedQuote = Awaited<ReturnType<PurchaseNmcdService['loadQuotes']>>[number];

function netKopecksOf(quote: LoadedQuote): number {
  const vat = quote.vatRate != null ? Number(quote.vatRate) : null;
  return netFromGrossKopecks(priceToKopecks(Number(quote.price)), vat);
}

function toSnapshotQuote(quote: LoadedQuote): NmcdSnapshotQuote {
  const net = kopecksToAmount(netKopecksOf(quote));
  return {
    quote_id: quote.id,
    partner_name: formatPartnerDisplayName(quote.partnerShortName, quote.partnerName),
    gross: String(quote.price),
    net,
    vat_percent: quote.vatRate,
  };
}

function emptySnapshot(method: string, amount: string | null, note: string | null): NmcdSnapshot {
  return {
    method,
    amount,
    note,
    average_before: null,
    average_after: null,
    included: [],
    excluded: [],
  };
}

function toMarketPreview(result: ReturnType<typeof calculateMarketNmcd>): MarketPreview {
  return {
    ok: result.ok,
    code: result.ok ? undefined : result.code,
    average_before: result.average_before != null ? kopecksToAmount(result.average_before) : null,
    average_after: result.ok ? kopecksToAmount(result.average_after) : null,
    included_quote_ids: result.included.map(row => row.quote_id),
    excluded: result.excluded.map(row => ({ quote_id: row.quote_id, deviation: row.deviation_percent })),
  };
}

function marketFailMessage(code: 'too_few_quotes' | 'too_few_after_filter'): string {
  if (code === 'too_few_quotes') return 'Для метода «рынок» нужно минимум 3 КП';
  return 'После исключения выбросов осталось меньше 3 КП. Выберите другой метод расчёта НМЦД.';
}

async function insertNmcdEvent(
  db: { insert: DatabaseService['db']['insert'] },
  row: {
    requestId: string;
    action: 'price_fixed' | 'supplier_selected';
    payload: PurchaseRequestEventPayload;
    actorId: string;
  },
) {
  await db.insert(purchaseRequestEvents).values({
    requestId: row.requestId,
    action: row.action,
    payload: row.payload,
    actorId: row.actorId,
  });
}
