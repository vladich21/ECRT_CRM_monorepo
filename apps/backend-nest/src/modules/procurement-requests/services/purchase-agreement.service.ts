import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import {
  approvalProcesses,
  approvalRoutes,
  refApprovalEntityTypes,
} from '../../../database/schema';
import type { SectionPermission } from '../../../shared/permissions';
import { ApprovalEngineService } from '../../approvals/services/approval-engine.service';
import { canPatchElaboration } from '../domain/purchase-request.policy';
import { isQuoteExpiring, moscowDateIso } from '../domain/purchase-quote.workdays';
import {
  PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
  PURCHASE_REQUEST_AGREEMENT_ROUTE_CODE,
} from '../domain/purchase-request.transitions';
import type { SendPurchaseRequestToAgreementDto } from '../dto/purchase-agreement.dto';
import { purchaseQuotes, purchaseRequestEvents, purchaseRequests } from '../procurement-requests.schema';
import { toIsoSafe } from '../purchase-request.mapper';
import { PurchaseRequestsService } from './purchase-requests.service';

@Injectable()
export class PurchaseAgreementService {
  constructor(
    private readonly db: DatabaseService,
    private readonly requests: PurchaseRequestsService,
    private readonly approvalEngine: ApprovalEngineService,
  ) {}

  async sendToAgreement(
    id: string,
    dto: SendPurchaseRequestToAgreementDto,
    actorId: string,
    permissions: SectionPermission[] | undefined,
  ) {
    const [existing] = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        leadManagerId: purchaseRequests.leadManagerId,
        priceMethod: purchaseRequests.priceMethod,
        selectedQuoteId: purchaseRequests.selectedQuoteId,
        updatedAt: purchaseRequests.updatedAt,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException('Запрос на закупку не найден');
    if (toIsoSafe(existing.updatedAt) !== toIsoSafe(dto.updated_at)) {
      throw new ConflictException('Карточка изменена другим пользователем, обновите данные');
    }
    if (
      !canPatchElaboration({
        status: existing.status,
        leadManagerId: existing.leadManagerId,
        actorId,
      })
    ) {
      throw new ForbiddenException('Отправить на согласование может только назначенный ведущий ОУП');
    }
    if (!existing.priceMethod) {
      throw new BadRequestException({
        message: 'Сначала зафиксируйте НМЦД',
        fields: ['price_method'],
      });
    }
    if (!existing.selectedQuoteId) {
      throw new BadRequestException({
        message: 'Сначала выберите поставщика',
        fields: ['selected_quote_id'],
      });
    }

    const quotes = await this.db.db
      .select({ validUntil: purchaseQuotes.validUntil })
      .from(purchaseQuotes)
      .where(eq(purchaseQuotes.requestId, id));
    const today = moscowDateIso();
    const expiring = quotes.some(quote => isQuoteExpiring(quote.validUntil, today));
    if (expiring && dto.confirm_expiring_quote !== true) {
      throw new HttpException(
        {
          message:
            'Срок действия КП истекает менее чем через 5 рабочих дней. Подтвердите отправку.',
          code: 'CONFIRM_EXPIRING_QUOTE',
        },
        HttpStatus.PRECONDITION_REQUIRED,
      );
    }

    const [revision] = await this.db.db
      .select({ id: approvalProcesses.id })
      .from(approvalProcesses)
      .where(
        and(
          eq(approvalProcesses.entityType, PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE),
          eq(approvalProcesses.entityId, id),
          eq(approvalProcesses.status, 'revision'),
        ),
      )
      .limit(1);

    if (revision) {
      await this.approvalEngine.resubmit(revision.id, {}, actorId);
    } else {
      const routeId = await this.findAgreementRouteId();
      await this.approvalEngine.startApprovalProcess(
        {
          entity_type: PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
          entity_id: id,
          route_id: routeId,
        },
        actorId,
        permissions,
      );
    }

    await this.db.db.insert(purchaseRequestEvents).values({
      requestId: id,
      action: 'agreement_started',
      payload: {},
      actorId,
    });

    return this.requests.getById(id);
  }

  private async findAgreementRouteId(): Promise<string> {
    const [preferred] = await this.db.db
      .select({ id: approvalRoutes.id })
      .from(approvalRoutes)
      .innerJoin(refApprovalEntityTypes, eq(refApprovalEntityTypes.id, approvalRoutes.entityTypeId))
      .where(
        and(
          eq(refApprovalEntityTypes.code, PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE),
          eq(approvalRoutes.code, PURCHASE_REQUEST_AGREEMENT_ROUTE_CODE),
          eq(approvalRoutes.isActive, true),
        ),
      )
      .limit(1);
    if (preferred) return preferred.id;

    throw new BadRequestException(
      'Не задан маршрут согласования запроса. Прогоните docs/procurement-requests-s11.sql',
    );
  }
}
