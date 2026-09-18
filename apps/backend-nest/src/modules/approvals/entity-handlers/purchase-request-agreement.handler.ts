import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { projects } from '../../../database/schema';
import { SECTIONS } from '../../../shared/permissions';
import {
  canPatchElaboration,
} from '../../procurement-requests/domain/purchase-request.policy';
import {
  IllegalPurchaseRequestTransition,
  isInElaboration,
  nextStatus,
  PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
  type PurchaseRequestTransitionAction,
} from '../../procurement-requests/domain/purchase-request.transitions';
import {
  purchaseQuotes,
  purchaseRequestSelectionReasons,
  purchaseRequests,
} from '../../procurement-requests/procurement-requests.schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';
import type { DrizzleTx } from '../types/approval.types';

/**
 * Согласование после проработки — отдельный entity type.
 * ВИ-4 на `purchase_request` после approve ставит lockedByApproved, второй процесс там не стартует.
 */
@Injectable()
export class PurchaseRequestAgreementHandler implements EntityHandler {
  readonly entityType = PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE;
  readonly requiredSection = SECTIONS.PROCUREMENT_REQUESTS;
  readonly hideGenericStart = true;

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        number: purchaseRequests.number,
        subject: purchaseRequests.subject,
        initiatorId: purchaseRequests.initiatorId,
        leadManagerId: purchaseRequests.leadManagerId,
        isUrgent: purchaseRequests.isUrgent,
        managerId: projects.managerId,
      })
      .from(purchaseRequests)
      .innerJoin(projects, eq(projects.id, purchaseRequests.projectId))
      .where(eq(purchaseRequests.id, entityId))
      .limit(1);
    return (rows[0] as ApprovalEntity | undefined) ?? null;
  }

  assertCanStartByStatus(entity: ApprovalEntity): void {
    if (!isInElaboration(String(entity.status ?? ''))) {
      throw new BadRequestException('На согласование можно отправить только из проработки');
    }
  }

  assertCanStart(entity: ApprovalEntity, userId: string): void {
    if (
      !canPatchElaboration({
        status: String(entity.status ?? ''),
        leadManagerId: (entity.leadManagerId as string | null) ?? null,
        actorId: userId,
      })
    ) {
      throw new ForbiddenException('Отправить на согласование может только назначенный ведущий ОУП');
    }
  }

  resolveOwnerId(entity: ApprovalEntity): string | null {
    return (entity.managerId as string | null) ?? null;
  }

  resolveContext(entity: ApprovalEntity): { number?: string; title?: string; type?: string } {
    const number = entity.number != null ? String(entity.number) : undefined;
    return {
      number,
      title: (entity.subject as string | null) ?? undefined,
      type: 'Запрос на закупку',
    };
  }

  resolveStartNotifyUserIds(entity: ApprovalEntity): string[] {
    const initiatorId = entity.initiatorId as string | null;
    return initiatorId ? [initiatorId] : [];
  }

  resolveTaskPriority(entity: ApprovalEntity): 'urgent' | undefined {
    return Boolean(entity.isUrgent) ? 'urgent' : undefined;
  }

  async onStart(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'to_agreement');
  }

  async onApproveFinal(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'approve');
  }

  async onReject(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'reject');
  }

  async onReturnToInitiator(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'return');
  }

  async onCancel(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'cancel');
  }

  private async applyStatus(
    tx: DrizzleTx,
    entity: ApprovalEntity,
    action: PurchaseRequestTransitionAction,
  ): Promise<void> {
    const id = entity.id as string;
    const from = String(entity.status ?? '');
    let next: string;
    try {
      next = nextStatus(from, action);
    } catch (error) {
      if (error instanceof IllegalPurchaseRequestTransition) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    const kickedBack = from === 'in_agreement' && (action === 'reject' || action === 'return');
    await tx
      .update(purchaseRequests)
      .set({
        status: next,
        updatedAt: new Date(),
        ...(kickedBack ? this.decisionResetPatch() : {}),
      })
      .where(eq(purchaseRequests.id, id));
    if (kickedBack) {
      await tx.delete(purchaseRequestSelectionReasons).where(eq(purchaseRequestSelectionReasons.requestId, id));
      await tx.update(purchaseQuotes).set({ excludedFromNmcd: false }).where(eq(purchaseQuotes.requestId, id));
    }
    entity.status = next;
  }

  /**
   * БП-28: возврат/отклонение на согласовании после проработки сбрасывает НМЦД
   * и выбор поставщика — ведущий ОУП пересматривает решения, а не отправляет старые.
   */
  private decisionResetPatch() {
    return {
      priceMethod: null,
      priceMethodNote: null,
      initialMaxPrice: null,
      nmcdSnapshot: null,
      selectedQuoteId: null,
      selectionNote: null,
    };
  }
}
