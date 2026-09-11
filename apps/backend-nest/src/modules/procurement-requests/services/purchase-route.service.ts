import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { contractStages } from '../../../database/schema';
import { ContractsService } from '../../contracts/services/contract.service';
import { canChooseRoute } from '../domain/purchase-request.policy';
import { grossFromNetKopecks, kopecksToAmount, priceToKopecks } from '../domain/purchase-quote.nmcd';
import {
  inactiveBaseContractMessage,
  notInVersionMessage,
  routeKindNotInVersion,
  type PurchaseRouteKind,
} from '../domain/purchase-request.route';
import { isAgreed } from '../domain/purchase-request.transitions';
import type { ChoosePurchaseRouteDto } from '../dto/purchase-route.dto';
import {
  purchaseQuotes,
  purchaseRequestDocuments,
  purchaseRequestEvents,
  purchaseRequests,
  refVatRates,
  type RouteDocumentSnapshot,
} from '../procurement-requests.schema';
import { toIsoSafe } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

function numericToKopecks(value: string | null): number | null {
  if (value == null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return priceToKopecks(amount);
}

function amountsFromNmcd(net: string | null, vatPercent: number | null) {
  const netKopecks = numericToKopecks(net);
  if (netKopecks == null) {
    return {
      excl: null as string | null,
      vat: null as string | null,
      incl: null as string | null,
      rate: vatPercent != null && Number.isFinite(vatPercent) ? String(vatPercent) : null,
    };
  }
  const inclKopecks = grossFromNetKopecks(netKopecks, vatPercent);
  return {
    excl: kopecksToAmount(netKopecks),
    vat: kopecksToAmount(inclKopecks - netKopecks),
    incl: kopecksToAmount(inclKopecks),
    rate: vatPercent != null && Number.isFinite(vatPercent) ? String(vatPercent) : null,
  };
}

@Injectable()
export class PurchaseRouteService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: PurchaseRequestsService,
    private readonly contracts: ContractsService,
  ) {}

  async chooseRoute(requestId: string, dto: ChoosePurchaseRouteDto, actorId: string) {
    const request = await this.loadRequest(requestId);
    if (
      !canChooseRoute({
        status: request.status,
        leadManagerId: request.leadManagerId,
        actorId,
        purchaseMethodId: request.purchaseMethodId,
      })
    ) {
      throw new ForbiddenException('Путь оформления выбирает назначенный ведущий ОУП после способа закупки');
    }
    if (!isAgreed(request.status)) {
      throw new ConflictException('Путь оформления доступен после согласования');
    }
    if (!request.purchaseMethodId) {
      throw new BadRequestException({
        message: 'Сначала сохраните способ закупки',
        fields: ['purchase_method_id'],
      });
    }

    const kind = dto.kind as PurchaseRouteKind;
    if (routeKindNotInVersion(kind)) {
      throw new UnprocessableEntityException(notInVersionMessage(kind));
    }
    if (kind === 'amendment' || kind === 'order') {
      await this.assertActiveBase(kind, dto.base_contract_id);
      throw new UnprocessableEntityException(notInVersionMessage(kind));
    }

    if (toIsoSafe(request.updatedAt) !== toIsoSafe(dto.updated_at)) {
      const existingId = await this.findRoutedContractId(requestId);
      if (existingId) return this.requests.getById(requestId);
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }

    const existingId = await this.findRoutedContractId(requestId);
    if (existingId) return this.requests.getById(requestId);

    if (!request.selectedQuoteId) {
      throw new BadRequestException({
        message: 'Сначала выберите поставщика',
        fields: ['selected_quote_id'],
      });
    }

    const partnerId = await this.loadSelectedPartnerId(request.selectedQuoteId, requestId);
    const stage = await this.loadIncomeStage(request.incomeStageId);
    const vatPercent = request.vatPercent != null ? Number(request.vatPercent) : null;
    const money = amountsFromNmcd(request.initialMaxPrice, Number.isFinite(vatPercent) ? vatPercent : null);
    const description = `По запросу на закупку №${request.number}. Валюта ${request.currencyCode}.`;

    let created: { id: string; partnerId: string | null };
    created = await this.db.db.transaction(async tx => {
      const draft = await this.contracts.createFromRequest(
        {
          name: request.subject,
          description,
          projectId: request.projectId,
          partnerId,
          responsibleId: request.leadManagerId,
          amountExclVat: money.excl,
          vatRate: money.rate,
          amountVat: money.vat,
          amountInclVat: money.incl,
          endDate: request.requiredDate,
          createdBy: actorId,
          stage: stage
            ? {
                name: stage.name,
                plannedStartDate: stage.plannedStartDate,
                plannedEndDate: stage.plannedEndDate,
                plannedBudget: money.excl ?? '0',
                responsibleId: stage.responsibleId ?? request.leadManagerId,
              }
            : money.excl
              ? {
                  name: 'Этап 1',
                  plannedStartDate: null,
                  plannedEndDate: request.requiredDate,
                  plannedBudget: money.excl,
                  responsibleId: request.leadManagerId,
                }
              : null,
        },
        tx,
      );

      const toSnap: RouteDocumentSnapshot = {
        kind: 'contract',
        contract_id: draft.id,
        contract_name: request.subject,
      };
      await tx.insert(purchaseRequestDocuments).values({
        requestId,
        kind: 'contract',
        entityType: 'contract',
        entityId: draft.id,
        createdBy: actorId,
      });
      await tx
        .update(purchaseRequests)
        .set({ updatedAt: new Date(), updatedBy: actorId })
        .where(eq(purchaseRequests.id, requestId));
      await tx.insert(purchaseRequestEvents).values({
        requestId,
        action: 'route_started',
        payload: { to: toSnap },
        actorId,
      });
      return draft;
    });

    this.contracts.notifyCreated(created.partnerId);
    return this.requests.getById(requestId);
  }

  async findRoutedContractId(requestId: string): Promise<string | null> {
    const [row] = await this.db.db
      .select({ entityId: purchaseRequestDocuments.entityId })
      .from(purchaseRequestDocuments)
      .where(
        and(eq(purchaseRequestDocuments.requestId, requestId), eq(purchaseRequestDocuments.kind, 'contract')),
      )
      .limit(1);
    return row?.entityId ?? null;
  }

  private async assertActiveBase(kind: 'amendment' | 'order', baseContractId: string | null | undefined) {
    if (!baseContractId) {
      throw new BadRequestException({
        message: 'Укажите договор-основание',
        fields: ['base_contract_id'],
      });
    }
    const base = await this.contracts.getActivity(baseContractId);
    if (!base || base.isDeleted) {
      throw new NotFoundException('Договор-основание не найден');
    }
    if (!base.isActive) {
      throw new UnprocessableEntityException(inactiveBaseContractMessage(kind));
    }
  }

  private async loadSelectedPartnerId(quoteId: string, requestId: string): Promise<string> {
    const [quote] = await this.db.db
      .select({ partnerId: purchaseQuotes.partnerId })
      .from(purchaseQuotes)
      .where(and(eq(purchaseQuotes.id, quoteId), eq(purchaseQuotes.requestId, requestId)))
      .limit(1);
    if (!quote) {
      throw new BadRequestException({
        message: 'Выбранное КП не найдено',
        fields: ['selected_quote_id'],
      });
    }
    return quote.partnerId;
  }

  private async loadIncomeStage(stageId: string | null) {
    if (!stageId) return null;
    const [row] = await this.db.db
      .select({
        name: contractStages.name,
        plannedStartDate: contractStages.plannedStartDate,
        plannedEndDate: contractStages.plannedEndDate,
        responsibleId: contractStages.responsibleId,
      })
      .from(contractStages)
      .where(eq(contractStages.id, stageId))
      .limit(1);
    return row ?? null;
  }

  private async loadRequest(requestId: string) {
    const [row] = await this.db.db
      .select({
        id: purchaseRequests.id,
        number: purchaseRequests.number,
        status: purchaseRequests.status,
        subject: purchaseRequests.subject,
        projectId: purchaseRequests.projectId,
        leadManagerId: purchaseRequests.leadManagerId,
        purchaseMethodId: purchaseRequests.purchaseMethodId,
        selectedQuoteId: purchaseRequests.selectedQuoteId,
        incomeStageId: purchaseRequests.incomeStageId,
        requiredDate: purchaseRequests.requiredDate,
        initialMaxPrice: purchaseRequests.initialMaxPrice,
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
}
