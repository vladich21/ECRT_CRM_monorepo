import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { asc, eq, sql } from 'drizzle-orm';
import { relApprovalProcessStepAssignees } from '../../../database/schema';
import type {
  ApprovalRuntimeData,
  DrizzleTx,
  ResolvedAssignee,
} from '../types/approval.types';

interface ProcessStepLike {
  id: string;
  stepOrder: number;
  name: string;
  assignmentType: string;
}

interface ResolveContext {
  initiatedBy: string;
  runtimeData: ApprovalRuntimeData;
  ownerId: string | null;
}

@Injectable()
export class AssigneeResolver {
  private readonly logger = new Logger(AssigneeResolver.name);

  async resolve(
    tx: DrizzleTx,
    step: ProcessStepLike,
    ctx: ResolveContext,
  ): Promise<ResolvedAssignee[]> {
    let assignees: ResolvedAssignee[];

    switch (step.assignmentType) {
      case 'employee':
        assignees = await this.resolveEmployee(tx, step.id);
        break;
      case 'initiator_head':
        assignees = await this.resolveInitiatorHead(tx, ctx.initiatedBy);
        break;
      case 'document_owner':
        assignees = this.resolveDocumentOwner(ctx.ownerId);
        break;
      case 'owner_or_head':
        assignees = await this.resolveOwnerOrHead(tx, ctx);
        break;
      case 'select_on_start':
        assignees = this.resolveSelectOnStart(step.stepOrder, ctx.runtimeData);
        break;
      case 'department_head':
        throw new BadRequestException(
          'Тип назначения «руководитель отдела» не поддерживается (нет руководителя у подразделений)',
        );
      default:
        throw new BadRequestException(`Неизвестный тип назначения: ${step.assignmentType}`);
    }

    if (!assignees.length) {
      throw new BadRequestException(`Не удалось определить согласующих для шага «${step.name}»`);
    }
    return assignees;
  }

  private async resolveEmployee(tx: DrizzleTx, processStepId: string): Promise<ResolvedAssignee[]> {
    const rows = await tx
      .select({
        employeeId: relApprovalProcessStepAssignees.employeeId,
        position: relApprovalProcessStepAssignees.position,
      })
      .from(relApprovalProcessStepAssignees)
      .where(eq(relApprovalProcessStepAssignees.processStepId, processStepId))
      .orderBy(asc(relApprovalProcessStepAssignees.position), asc(relApprovalProcessStepAssignees.createdAt));

    return rows.map((r) => ({
      assigneeId: r.employeeId,
      sourceType: 'employee' as const,
      position: r.position ?? 0,
    }));
  }

  async findSupervisor(tx: DrizzleTx, userId: string): Promise<string | null> {
    const result = await tx.execute(sql`
      WITH RECURSIVE chain AS (
        SELECT id, supervisor_id FROM users WHERE id = ${userId}
        UNION ALL
        SELECT e.id, e.supervisor_id FROM users e
        JOIN chain c ON c.supervisor_id = e.id
        WHERE c.supervisor_id <> ${userId}
      )
      SELECT supervisor_id AS id FROM chain
      WHERE supervisor_id IS NOT NULL AND supervisor_id <> ${userId}
      LIMIT 1
    `);
    return (result.rows[0]?.id as string | undefined) ?? null;
  }

  private async resolveInitiatorHead(tx: DrizzleTx, initiatedBy: string): Promise<ResolvedAssignee[]> {
    const headId = await this.findSupervisor(tx, initiatedBy);
    if (!headId) {
      this.logger.warn(`initiator_head не найден для ${initiatedBy} - fallback на самого инициатора`);
      return [{ assigneeId: initiatedBy, sourceType: 'initiator_head', position: 0 }];
    }
    return [{ assigneeId: headId, sourceType: 'initiator_head', position: 0 }];
  }

  private resolveDocumentOwner(ownerId: string | null): ResolvedAssignee[] {
    if (!ownerId) {
      throw new BadRequestException('Не удалось определить владельца документа для шага');
    }
    return [{ assigneeId: ownerId, sourceType: 'document_owner', position: 0 }];
  }

  private async resolveOwnerOrHead(tx: DrizzleTx, ctx: ResolveContext): Promise<ResolvedAssignee[]> {
    const byId = new Map<string, ResolvedAssignee>();
    if (ctx.ownerId) {
      byId.set(ctx.ownerId, { assigneeId: ctx.ownerId, sourceType: 'document_owner', position: 0 });
    }
    const headId = await this.findSupervisor(tx, ctx.initiatedBy);
    const secondId = headId ?? ctx.initiatedBy;
    if (!byId.has(secondId)) {
      byId.set(secondId, {
        assigneeId: secondId,
        sourceType: 'initiator_head',
        position: byId.size,
      });
    }
    if (!byId.size) {
      byId.set(ctx.initiatedBy, {
        assigneeId: ctx.initiatedBy,
        sourceType: 'initiator_head',
        position: 0,
      });
    }
    return [...byId.values()];
  }

  private resolveSelectOnStart(
    stepOrder: number,
    runtimeData: ApprovalRuntimeData,
  ): ResolvedAssignee[] {
    const entry = runtimeData.step_assignees?.find((s) => s.step_order === stepOrder);
    const ids = entry?.employee_ids ?? [];
    return ids.map((id, idx) => ({
      assigneeId: id,
      sourceType: 'select_on_start' as const,
      position: idx,
    }));
  }
}
