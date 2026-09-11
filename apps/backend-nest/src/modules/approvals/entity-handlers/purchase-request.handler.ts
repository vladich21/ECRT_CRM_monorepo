import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import { projects, relRoleSectionPermissions, relUsersRoles, sections, tasks, users } from '../../../database/schema';
import { SECTIONS } from '../../../shared/permissions';
import { needsIncomeContractForApprove } from '../../procurement-requests/domain/purchase-request.funding';
import { ASSIGN_LEAD_TASK_TYPE } from '../../procurement-requests/domain/purchase-request.oup';
import {
  IllegalPurchaseRequestTransition,
  isDraft,
  nextStatus,
  type PurchaseRequestTransitionAction,
} from '../../procurement-requests/domain/purchase-request.transitions';
import { purchaseRequests } from '../../procurement-requests/procurement-requests.schema';
import type { ApprovalEntity, EntityHandler } from './entity-handler.interface';
import type { DrizzleTx } from '../types/approval.types';

@Injectable()
export class PurchaseRequestEntityHandler implements EntityHandler {
  readonly entityType = 'purchase_request';
  readonly requiredSection = SECTIONS.PROCUREMENT_REQUESTS;
  readonly hideGenericStart = true;
  private readonly logger = new Logger(PurchaseRequestEntityHandler.name);

  constructor(private readonly db: DatabaseService) {}

  async loadEntity(entityId: string): Promise<ApprovalEntity | null> {
    const rows = await this.db.db
      .select({
        id: purchaseRequests.id,
        status: purchaseRequests.status,
        number: purchaseRequests.number,
        subject: purchaseRequests.subject,
        initiatorId: purchaseRequests.initiatorId,
        techAcceptorId: purchaseRequests.techAcceptorId,
        fundingSource: purchaseRequests.fundingSource,
        incomeContractId: purchaseRequests.incomeContractId,
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
    if (!isDraft(String(entity.status ?? ''))) {
      throw new BadRequestException('На утверждение можно отправить только черновик');
    }
  }

  assertCanStart(entity: ApprovalEntity, userId: string): void {
    if (entity.initiatorId !== userId) {
      throw new ForbiddenException('Отправить на утверждение может только инициатор');
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
    const techId = entity.techAcceptorId as string | null;
    return techId ? [techId] : [];
  }

  resolveTaskPriority(entity: ApprovalEntity): 'urgent' | undefined {
    return Boolean(entity.isUrgent) ? 'urgent' : undefined;
  }

  async onStart(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    await this.applyStatus(tx, entity, 'submit');
  }

  async onApproveFinal(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    const id = entity.id as string;
    const [fresh] = await tx
      .select({
        fundingSource: purchaseRequests.fundingSource,
        incomeContractId: purchaseRequests.incomeContractId,
        status: purchaseRequests.status,
      })
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, id))
      .limit(1);
    if (fresh) {
      entity.fundingSource = fresh.fundingSource;
      entity.incomeContractId = fresh.incomeContractId;
      entity.status = fresh.status;
    }
    if (needsIncomeContractForApprove(String(entity.fundingSource ?? ''), entity.incomeContractId as string | null)) {
      throw new UnprocessableEntityException(
        'Нельзя утвердить запрос без доходного договора. Укажите договор и повторите.',
      );
    }
    await this.applyStatus(tx, entity, 'approve');
    await this.createAssignLeadTasks(tx, entity);
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
    let next: string;
    try {
      next = nextStatus(String(entity.status ?? ''), action);
    } catch (error) {
      if (error instanceof IllegalPurchaseRequestTransition) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
    await tx
      .update(purchaseRequests)
      .set({ status: next, updatedAt: new Date() })
      .where(eq(purchaseRequests.id, id));
    entity.status = next;
  }

  /** ЗАП-9: задача руководителям ОУП (edit на procurement.lead), не начальнику инициатора. */
  private async createAssignLeadTasks(tx: DrizzleTx, entity: ApprovalEntity): Promise<void> {
    const requestId = entity.id as string;
    const number = entity.number != null ? String(entity.number) : '';
    const editorIds = await this.findSectionEditorIds(tx, SECTIONS.PROCUREMENT_LEAD);
    if (editorIds.length === 0) {
      this.logger.warn(`Нет пользователей с правом ${SECTIONS.PROCUREMENT_LEAD} — задача «назначить ведущего» не создана`);
      return;
    }
    const dueDate = new Date(Date.now() + 3 * 86_400_000);
    for (const assigneeId of editorIds) {
      await tx.insert(tasks).values({
        entityType: this.entityType,
        entityId: requestId,
        taskType: ASSIGN_LEAD_TASK_TYPE,
        sourceType: 'purchase_request',
        sourceId: requestId,
        title: `Назначить ведущего ОУП по запросу ${number}`,
        description: `Запрос ${number} утвержден и переведен в проработку. Назначьте ведущего ОУП.`,
        assigneeId,
        dueDate,
        priority: this.resolveTaskPriority(entity) ?? 'normal',
        status: 'open',
      });
    }
  }

  private async findSectionEditorIds(tx: DrizzleTx, sectionCode: string): Promise<string[]> {
    const rows = await tx
      .selectDistinct({ userId: relUsersRoles.userId })
      .from(relUsersRoles)
      .innerJoin(relRoleSectionPermissions, eq(relRoleSectionPermissions.roleId, relUsersRoles.roleId))
      .innerJoin(sections, eq(sections.id, relRoleSectionPermissions.sectionId))
      .innerJoin(users, eq(users.id, relUsersRoles.userId))
      .where(
        and(
          eq(sections.code, sectionCode),
          eq(relRoleSectionPermissions.canEdit, true),
          eq(users.isActive, true),
        ),
      );
    return rows.map(row => row.userId);
  }
}
