import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import type { SectionPermission } from '../../../shared/permissions';
import { canSetPurchaseMethod } from '../domain/purchase-request.policy';
import { isAgreed } from '../domain/purchase-request.transitions';
import { evaluatePurchaseMethods, purchaseMethodSelectError } from '../domain/purchase-request.method';
import { grossFromNetKopecks, kopecksToAmount, priceToKopecks } from '../domain/purchase-quote.nmcd';
import type { SetPurchaseMethodDto } from '../dto/purchase-method.dto';
import {
  purchaseMethodThresholds,
  purchaseRequestEvents,
  purchaseRequests,
  refPurchaseMethods,
  refVatRates,
  type PurchaseMethodSnapshot,
} from '../procurement-requests.schema';
import { toIsoSafe } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

function numericToKopecks(value: string | null): number | null {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return priceToKopecks(amount);
}

@Injectable()
export class PurchaseMethodService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: PurchaseRequestsService,
  ) {}

  async listMethods(requestId: string, actorId: string, permissions: SectionPermission[] | undefined) {
    await this.requests.assertCanView(requestId, actorId, permissions);
    const request = await this.loadRequest(requestId);
    this.assertAgreed(request.status);
    const catalog = await this.loadCatalog();
    const evaluated = this.evaluate(request, catalog);
    return this.toResponse(request, catalog, evaluated);
  }

  async setMethod(requestId: string, dto: SetPurchaseMethodDto, actorId: string) {
    const request = await this.loadRequest(requestId);
    if (toIsoSafe(request.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }
    if (
      !canSetPurchaseMethod({
        status: request.status,
        leadManagerId: request.leadManagerId,
        actorId,
      })
    ) {
      throw new ForbiddenException('Способ закупки может сохранить только назначенный ведущий ОУП');
    }
    this.assertAgreed(request.status);

    const catalog = await this.loadCatalog();
    const evaluated = this.evaluate(request, catalog);
    const chosen = evaluated.find(row => row.id === dto.method_id);
    if (!chosen) {
      throw new BadRequestException({ message: 'Неизвестный способ закупки', fields: ['method_id'] });
    }

    const justification = dto.method_justification?.trim() || null;
    const error = purchaseMethodSelectError(chosen, justification);
    if (error === 'forbidden') {
      throw new BadRequestException({
        message: 'Свыше верхнего порога доступна только комиссия',
        fields: ['method_id'],
      });
    }
    if (error === 'need_justification') {
      throw new BadRequestException({
        message: 'Для способа вне порога укажите обоснование',
        fields: ['method_justification'],
      });
    }

    const note = justification;
    const toSnap: PurchaseMethodSnapshot = {
      method_id: chosen.id,
      method_code: chosen.code,
      method_name: chosen.name,
      in_threshold: chosen.in_threshold,
    };

    await this.db.db.transaction(async tx => {
      await tx
        .update(purchaseRequests)
        .set({
          purchaseMethodId: chosen.id,
          methodJustification: note,
          updatedAt: new Date(),
          updatedBy: actorId,
        })
        .where(eq(purchaseRequests.id, requestId));
      await tx.insert(purchaseRequestEvents).values({
        requestId,
        action: 'method_selected',
        payload: { to: toSnap },
        comment: note,
        actorId,
      });
    });

    return this.requests.getById(requestId);
  }

  private assertAgreed(status: string) {
    if (!isAgreed(status)) {
      throw new ConflictException('Способ закупки доступен после согласования');
    }
  }

  private evaluate(
    request: Awaited<ReturnType<PurchaseMethodService['loadRequest']>>,
    catalog: Awaited<ReturnType<PurchaseMethodService['loadCatalog']>>,
  ) {
    const netKopecks = numericToKopecks(request.initialMaxPrice);
    const vatPercent = request.vatPercent != null ? Number(request.vatPercent) : null;
    const grossKopecks =
      netKopecks == null ? null : grossFromNetKopecks(netKopecks, Number.isFinite(vatPercent) ? vatPercent : null);
    return evaluatePurchaseMethods(
      catalog.map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        amount_from_kopecks: numericToKopecks(row.amountFrom),
        amount_to_kopecks: numericToKopecks(row.amountTo),
        vat_base: row.vatBase,
      })),
      netKopecks,
      grossKopecks,
    );
  }

  private toResponse(
    request: Awaited<ReturnType<PurchaseMethodService['loadRequest']>>,
    catalog: Awaited<ReturnType<PurchaseMethodService['loadCatalog']>>,
    evaluated: ReturnType<PurchaseMethodService['evaluate']>,
  ) {
    const netKopecks = numericToKopecks(request.initialMaxPrice) ?? 0;
    const vatPercent = request.vatPercent != null ? Number(request.vatPercent) : null;
    const grossKopecks = grossFromNetKopecks(netKopecks, Number.isFinite(vatPercent) ? vatPercent : null);
    const recommended = evaluated.find(row => row.in_threshold) ?? null;
    return {
      amount_net: request.initialMaxPrice,
      amount_gross: kopecksToAmount(grossKopecks),
      currency_code: request.currencyCode,
      vat_percent: request.vatPercent,
      vat_base_used: recommended?.vat_base ?? 'net',
      recommended_method_id: recommended?.id ?? null,
      selected_method_id: request.purchaseMethodId,
      method_justification: request.methodJustification,
      request_updated_at: toIsoSafe(request.updatedAt),
      methods: evaluated.map(row => {
        const source = catalog.find(item => item.id === row.id);
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          amount_from: source?.amountFrom ?? null,
          amount_to: source?.amountTo ?? null,
          vat_base: row.vat_base,
          in_threshold: row.in_threshold,
          allowed: row.allowed,
          requires_justification: row.requires_justification,
        };
      }),
    };
  }

  private async loadRequest(requestId: string) {
    const [row] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        leadManagerId: purchaseRequests.leadManagerId,
        initialMaxPrice: purchaseRequests.initialMaxPrice,
        purchaseMethodId: purchaseRequests.purchaseMethodId,
        methodJustification: purchaseRequests.methodJustification,
        currencyCode: purchaseRequests.currencyCode,
        updatedAt: purchaseRequests.updatedAt,
        vatPercent: refVatRates.rate,
      })
      .from(purchaseRequests)
      .leftJoin(refVatRates, eq(refVatRates.id, purchaseRequests.vatRateId))
      .where(eq(purchaseRequests.id, requestId))
      .limit(1);
    if (!row) throw new NotFoundException('Запрос на закупку не найден');
    return row;
  }

  private async loadCatalog() {
    return this.db.db
      .select({
        id: refPurchaseMethods.id,
        code: refPurchaseMethods.code,
        name: refPurchaseMethods.name,
        sortOrder: refPurchaseMethods.sortOrder,
        amountFrom: purchaseMethodThresholds.amountFrom,
        amountTo: purchaseMethodThresholds.amountTo,
        vatBase: purchaseMethodThresholds.vatBase,
      })
      .from(refPurchaseMethods)
      .innerJoin(
        purchaseMethodThresholds,
        and(
          eq(purchaseMethodThresholds.methodId, refPurchaseMethods.id),
          eq(purchaseMethodThresholds.isActive, true),
        ),
      )
      .where(eq(refPurchaseMethods.isActive, true))
      .orderBy(asc(refPurchaseMethods.sortOrder));
  }
}
