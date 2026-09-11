import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { files, partners } from '../../../database/schema';
import { buildFileDownloadUrl } from '../../files/file-download-url';
import { formatPartnerDisplayName } from '../../partners/domain/partner-procurement-flags';
import type { SectionPermission } from '../../../shared/permissions';
import { canPatchElaboration } from '../domain/purchase-request.policy';
import { PURCHASE_QUOTE_FILE_ENTITY_TYPE } from '../domain/purchase-quote.enums';
import {
  validatePaymentTerms,
  type PaymentTermLine,
  type PaymentTermsError,
} from '../domain/purchase-quote.payment-terms';
import type { CreatePurchaseQuoteDto, PurchaseQuotePaymentTermDto, UpdatePurchaseQuoteDto } from '../dto/purchase-quote.dto';
import {
  purchaseQuotePaymentTerms,
  purchaseQuotes,
  purchaseRequestEvents,
  purchaseRequests,
  purchaseRequestSuppliers,
  refVatRates,
  type QuoteSnapshot,
  type PurchaseRequestEventPayload,
} from '../procurement-requests.schema';
import { toIsoSafe } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

export type PurchaseQuoteFile = {
  id: string;
  name: string;
  url: string;
  size: string | null;
};

export type PurchaseQuoteTerm = {
  line_no: number;
  share: string;
  payment_type: string;
  days: number | null;
  day_kind: string | null;
  base_event: string | null;
};

export type PurchaseQuoteRow = {
  id: string;
  request_id: string;
  partner_id: string;
  partner_name: string;
  quote_number: string | null;
  quote_date: string | null;
  valid_until: string | null;
  price: string;
  currency_code: string;
  vat_rate_id: string | null;
  vat_rate_name: string | null;
  vat_percent: string | null;
  delivery_days: number | null;
  warranty_months: number | null;
  contact_name: string | null;
  comment: string | null;
  excluded_from_nmcd: boolean;
  payment_terms: PurchaseQuoteTerm[];
  files: PurchaseQuoteFile[];
  updated_at: string;
  request_updated_at: string;
};

@Injectable()
export class PurchaseQuotesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly requests: PurchaseRequestsService,
  ) {}

  async listVatRates() {
    const rows = await this.db.db
      .select({
        id: refVatRates.id,
        code: refVatRates.code,
        name: refVatRates.name,
        rate: refVatRates.rate,
      })
      .from(refVatRates)
      .where(eq(refVatRates.isActive, true))
      .orderBy(asc(refVatRates.sortOrder), asc(refVatRates.rate));
    return {
      data: rows.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        rate: row.rate,
      })),
    };
  }

  async list(requestId: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.requests.assertCanView(requestId, actorId, permissions);
    const quotes = await this.loadQuoteHeaders(requestId);
    return { data: await this.attachTermsAndFiles(quotes) };
  }

  async create(requestId: string, dto: CreatePurchaseQuoteDto, actorId: string) {
    const existing = await this.loadWritableRequest(requestId, actorId);
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    await this.assertSupplierOnRequest(requestId, dto.partner_id);
    await this.assertVatRate(dto.vat_rate_id);
    this.assertQuoteDates(dto.quote_date ?? null, dto.valid_until ?? null);

    const lines = this.validatedLines(dto.payment_terms);
    const partnerName = await this.loadPartnerName(dto.partner_id);
    const currency = (dto.currency_code ?? 'RUB').trim().toUpperCase() || 'RUB';

    let quoteId: string;
    try {
      quoteId = await this.db.db.transaction(async tx => {
        const [inserted] = await tx
          .insert(purchaseQuotes)
          .values({
            requestId,
            partnerId: dto.partner_id,
            quoteNumber: dto.quote_number?.trim() || null,
            quoteDate: dto.quote_date ?? null,
            validUntil: dto.valid_until ?? null,
            price: String(dto.price),
            currencyCode: currency,
            vatRateId: dto.vat_rate_id,
            deliveryDays: dto.delivery_days ?? null,
            warrantyMonths: dto.warranty_months ?? null,
            contactName: dto.contact_name?.trim() || null,
            comment: dto.comment?.trim() || null,
          })
          .returning({ id: purchaseQuotes.id });
        const id = inserted?.id;
        if (!id) throw new Error('Не удалось сохранить КП');

        await tx.insert(purchaseQuotePaymentTerms).values(toTermRows(id, lines));
        await tx
          .update(purchaseRequests)
          .set({ updatedAt: new Date(), updatedBy: actorId })
          .where(eq(purchaseRequests.id, requestId));
        await insertQuoteEvent(tx, {
          requestId,
          action: 'quote_added',
          payload: {
            to: quoteSnap(id, dto.partner_id, partnerName, String(dto.price)),
          },
          actorId,
        });
        return id;
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('По этому поставщику уже есть КП');
      }
      throw err;
    }

    const [created] = await this.attachTermsAndFiles(await this.loadQuoteHeaders(requestId, quoteId));
    if (!created) throw new NotFoundException('КП не найдено');
    return created;
  }

  async update(quoteId: string, dto: UpdatePurchaseQuoteDto, actorId: string) {
    const [quote] = await this.db.db
      .select({
        id: purchaseQuotes.id,
        requestId: purchaseQuotes.requestId,
        partnerId: purchaseQuotes.partnerId,
        quoteDate: purchaseQuotes.quoteDate,
        validUntil: purchaseQuotes.validUntil,
        price: purchaseQuotes.price,
        updatedAt: purchaseQuotes.updatedAt,
      })
      .from(purchaseQuotes)
      .where(eq(purchaseQuotes.id, quoteId))
      .limit(1);
    if (!quote) throw new NotFoundException('КП не найдено');

    await this.loadWritableRequest(quote.requestId, actorId);
    if (toIsoSafe(quote.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('КП изменено другим пользователем, обновите данные');
    }

    if (dto.vat_rate_id) await this.assertVatRate(dto.vat_rate_id);
    const nextDate = dto.quote_date !== undefined ? dto.quote_date : quote.quoteDate;
    const nextUntil = dto.valid_until !== undefined ? dto.valid_until : quote.validUntil;
    this.assertQuoteDates(nextDate ?? null, nextUntil ?? null);

    const lines = dto.payment_terms ? this.validatedLines(dto.payment_terms) : null;
    const partnerName = await this.loadPartnerName(quote.partnerId);
    const nextPrice = dto.price != null ? String(dto.price) : quote.price;

    await this.db.db.transaction(async tx => {
      if (lines) {
        await tx.delete(purchaseQuotePaymentTerms).where(eq(purchaseQuotePaymentTerms.quoteId, quoteId));
        await tx.insert(purchaseQuotePaymentTerms).values(toTermRows(quoteId, lines));
      }
      await tx
        .update(purchaseQuotes)
        .set({
          ...(dto.quote_number !== undefined ? { quoteNumber: dto.quote_number?.trim() || null } : {}),
          ...(dto.quote_date !== undefined ? { quoteDate: dto.quote_date } : {}),
          ...(dto.valid_until !== undefined ? { validUntil: dto.valid_until } : {}),
          ...(dto.price != null ? { price: String(dto.price) } : {}),
          ...(dto.currency_code !== undefined
            ? { currencyCode: dto.currency_code.trim().toUpperCase() || 'RUB' }
            : {}),
          ...(dto.vat_rate_id !== undefined ? { vatRateId: dto.vat_rate_id } : {}),
          ...(dto.delivery_days !== undefined ? { deliveryDays: dto.delivery_days } : {}),
          ...(dto.warranty_months !== undefined ? { warrantyMonths: dto.warranty_months } : {}),
          ...(dto.contact_name !== undefined ? { contactName: dto.contact_name?.trim() || null } : {}),
          ...(dto.comment !== undefined ? { comment: dto.comment?.trim() || null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(purchaseQuotes.id, quoteId));
      await tx
        .update(purchaseRequests)
        .set({ updatedAt: new Date(), updatedBy: actorId })
        .where(eq(purchaseRequests.id, quote.requestId));
      await insertQuoteEvent(tx, {
        requestId: quote.requestId,
        action: 'quote_updated',
        payload: {
          to: quoteSnap(quoteId, quote.partnerId, partnerName, nextPrice),
        },
        actorId,
      });
    });

    const [updated] = await this.attachTermsAndFiles(await this.loadQuoteHeaders(quote.requestId, quoteId));
    if (!updated) throw new NotFoundException('КП не найдено');
    return updated;
  }

  private async loadWritableRequest(requestId: string, actorId: string) {
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
      throw new ForbiddenException('КП может сохранить только назначенный ведущий ОУП');
    }
    return existing;
  }

  private async assertSupplierOnRequest(requestId: string, partnerId: string) {
    const [row] = await this.db.db
      .select({ partnerId: purchaseRequestSuppliers.partnerId })
      .from(purchaseRequestSuppliers)
      .where(
        and(eq(purchaseRequestSuppliers.requestId, requestId), eq(purchaseRequestSuppliers.partnerId, partnerId)),
      )
      .limit(1);
    if (!row) {
      throw new BadRequestException({
        message: 'Сначала добавьте поставщика в запрос',
        fields: ['partner_id'],
      });
    }
  }

  private async assertVatRate(vatRateId: string) {
    const [row] = await this.db.db
      .select({ id: refVatRates.id, isActive: refVatRates.isActive })
      .from(refVatRates)
      .where(eq(refVatRates.id, vatRateId))
      .limit(1);
    if (!row) {
      throw new BadRequestException({ message: 'Ставка НДС не найдена', fields: ['vat_rate_id'] });
    }
    if (!row.isActive) {
      throw new BadRequestException({ message: 'Ставка НДС неактивна', fields: ['vat_rate_id'] });
    }
  }

  private assertQuoteDates(quoteDate: string | null, validUntil: string | null) {
    if (quoteDate && validUntil && validUntil < quoteDate) {
      throw new UnprocessableEntityException('Срок действия КП не может быть раньше даты КП');
    }
  }

  private validatedLines(terms: PurchaseQuotePaymentTermDto[]): PaymentTermLine[] {
    const lines: PaymentTermLine[] = terms.map(row => ({
      share: row.share,
      payment_type: row.payment_type,
      days: row.days ?? null,
      day_kind: row.day_kind ?? null,
      base_event: row.base_event?.trim() || null,
    }));
    const error = validatePaymentTerms(lines);
    if (error) throwPaymentTerms(error);
    return lines.map(line =>
      line.payment_type === 'advance' ? { ...line, days: null, day_kind: null } : line,
    );
  }

  private async loadPartnerName(partnerId: string): Promise<string | null> {
    const [row] = await this.db.db
      .select({ name: partners.name, shortName: partners.shortName })
      .from(partners)
      .where(eq(partners.id, partnerId))
      .limit(1);
    return row ? formatPartnerDisplayName(row.shortName, row.name) : null;
  }

  private async loadQuoteHeaders(requestId: string, quoteId?: string) {
    return this.db.db
      .select({
        id: purchaseQuotes.id,
        requestId: purchaseQuotes.requestId,
        partnerId: purchaseQuotes.partnerId,
        quoteNumber: purchaseQuotes.quoteNumber,
        quoteDate: purchaseQuotes.quoteDate,
        validUntil: purchaseQuotes.validUntil,
        price: purchaseQuotes.price,
        currencyCode: purchaseQuotes.currencyCode,
        vatRateId: purchaseQuotes.vatRateId,
        deliveryDays: purchaseQuotes.deliveryDays,
        warrantyMonths: purchaseQuotes.warrantyMonths,
        contactName: purchaseQuotes.contactName,
        comment: purchaseQuotes.comment,
        excludedFromNmcd: purchaseQuotes.excludedFromNmcd,
        updatedAt: purchaseQuotes.updatedAt,
        partnerName: partners.name,
        partnerShortName: partners.shortName,
        vatName: refVatRates.name,
        vatRate: refVatRates.rate,
        requestUpdatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseQuotes)
      .innerJoin(purchaseRequests, eq(purchaseRequests.id, purchaseQuotes.requestId))
      .innerJoin(partners, eq(partners.id, purchaseQuotes.partnerId))
      .leftJoin(refVatRates, eq(refVatRates.id, purchaseQuotes.vatRateId))
      .where(
        quoteId
          ? and(eq(purchaseQuotes.requestId, requestId), eq(purchaseQuotes.id, quoteId))
          : eq(purchaseQuotes.requestId, requestId),
      )
      .orderBy(asc(purchaseQuotes.createdAt));
  }

  private async attachTermsAndFiles(
    headers: Awaited<ReturnType<PurchaseQuotesService['loadQuoteHeaders']>>,
  ): Promise<PurchaseQuoteRow[]> {
    if (headers.length === 0) return [];
    const ids = headers.map(row => row.id);
    const [termRows, fileRows] = await Promise.all([
      this.db.db
        .select()
        .from(purchaseQuotePaymentTerms)
        .where(inArray(purchaseQuotePaymentTerms.quoteId, ids))
        .orderBy(asc(purchaseQuotePaymentTerms.lineNo)),
      this.db.db
        .select({
          id: files.id,
          name: files.name,
          size: files.size,
          tableId: files.tableId,
        })
        .from(files)
        .where(and(eq(files.entityType, PURCHASE_QUOTE_FILE_ENTITY_TYPE), inArray(files.tableId, ids), eq(files.isCurrent, true))),
    ]);

    const termsByQuote = new Map<string, PurchaseQuoteTerm[]>();
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

    const filesByQuote = new Map<string, PurchaseQuoteFile[]>();
    for (const row of fileRows) {
      if (!row.tableId) continue;
      const list = filesByQuote.get(row.tableId) ?? [];
      list.push({
        id: String(row.id),
        name: row.name,
        url: buildFileDownloadUrl(this.config, String(row.id)),
        size: row.size != null ? String(row.size) : null,
      });
      filesByQuote.set(row.tableId, list);
    }

    return headers.map(row => ({
      id: row.id,
      request_id: row.requestId,
      partner_id: row.partnerId,
      partner_name: formatPartnerDisplayName(row.partnerShortName, row.partnerName),
      quote_number: row.quoteNumber,
      quote_date: row.quoteDate,
      valid_until: row.validUntil,
      price: String(row.price),
      currency_code: row.currencyCode,
      vat_rate_id: row.vatRateId,
      vat_rate_name: row.vatName,
      vat_percent: row.vatRate,
      delivery_days: row.deliveryDays,
      warranty_months: row.warrantyMonths,
      contact_name: row.contactName,
      comment: row.comment,
      excluded_from_nmcd: row.excludedFromNmcd,
      payment_terms: termsByQuote.get(row.id) ?? [],
      files: filesByQuote.get(row.id) ?? [],
      updated_at: toIsoSafe(row.updatedAt),
      request_updated_at: toIsoSafe(row.requestUpdatedAt),
    }));
  }
}

function toTermRows(quoteId: string, lines: PaymentTermLine[]) {
  return lines.map((line, index) => ({
    quoteId,
    lineNo: index + 1,
    share: line.share.toFixed(2),
    paymentType: line.payment_type,
    days: line.days,
    dayKind: line.day_kind,
    baseEvent: line.base_event,
  }));
}

function quoteSnap(
  quoteId: string,
  partnerId: string,
  partnerName: string | null,
  price: string,
): QuoteSnapshot {
  return { quote_id: quoteId, partner_id: partnerId, partner_name: partnerName, price };
}

async function insertQuoteEvent(
  db: { insert: DatabaseService['db']['insert'] },
  row: {
    requestId: string;
    action: 'quote_added' | 'quote_updated';
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

function throwPaymentTerms(error: PaymentTermsError): never {
  switch (error.kind) {
    case 'empty':
      throw new BadRequestException({ message: 'Укажите строки оплаты', fields: ['payment_terms'] });
    case 'too_many':
      throw new BadRequestException({ message: 'Слишком много строк оплаты', fields: ['payment_terms'] });
    case 'share_sum':
      throw new UnprocessableEntityException('Сумма долей оплаты должна быть 100%');
    case 'advance_has_schedule':
      throw new BadRequestException({
        message: 'У аванса нет срока в днях',
        fields: [`payment_terms.${error.lineNo}.days`],
      });
    case 'payment_missing_schedule':
      throw new BadRequestException({
        message: 'Для оплаты укажите дни и тип дней',
        fields: [`payment_terms.${error.lineNo}.days`, `payment_terms.${error.lineNo}.day_kind`],
      });
    case 'unknown_type':
      throw new BadRequestException({
        message: 'Неизвестный тип оплаты',
        fields: [`payment_terms.${error.lineNo}.payment_type`],
      });
    case 'unknown_day_kind':
      throw new BadRequestException({
        message: 'Тип дней: календарные или рабочие',
        fields: [`payment_terms.${error.lineNo}.day_kind`],
      });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
