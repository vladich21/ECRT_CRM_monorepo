import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  approvalProcessSteps,
  refApprovalStepRoles,
  relApprovalProcessStepAssignees,
  relApprovalStepAssignees,
} from '../../../database/schema';
import { AssigneeResolver } from '../resolvers/assignee.resolver';
import { STEP_ROLE_APPROVER_FINAL, type DrizzleTx } from '../types/approval.types';
import { isStepOrderIncluded } from '../utils/approval-step-inclusion';

/** Типы, которые можно предсказать заранее — не требуют выбора при старте. */
const EAGERLY_RESOLVABLE_TYPES = ['document_owner', 'initiator_head', 'owner_or_head'];

/** Шаг шаблона (approval_route_steps), нужный для снапшота. */
export interface RouteStepRow {
  id: string;
  stepOrder: number;
  name: string;
  description: string | null;
  stepType: string;
  assignmentType: string;
  stepRoleId: string | null;
  isRequired: boolean | null;
  canDelegate: boolean | null;
  canReturnToPrevious: boolean | null;
  timeLimitHours: number | null;
}

/** Снапшот шага процесса (то, что читает рантайм). */
export interface ProcessStepRow {
  id: string;
  stepOrder: number;
  name: string;
  stepType: string;
  assignmentType: string;
  stepRoleCode: string | null;
  isRequired: boolean;
  isIncluded: boolean;
  canDelegate: boolean;
  canReturnToPrevious: boolean;
  timeLimitHours: number | null;
}

export interface SnapshotResult {
  steps: ProcessStepRow[];
  hasApproverFinal: boolean;
}

/**
 * Копирует шаги маршрута в process-owned таблицы (POR-209).
 * Денормализует роль (переживёт удаление ref-роли). Рантайм читает только снапшот.
 */
@Injectable()
export class ApprovalSnapshotService {
  private readonly logger = new Logger(ApprovalSnapshotService.name);

  constructor(private readonly resolver: AssigneeResolver) {}

  async snapshot(
    tx: DrizzleTx,
    processId: string,
    routeSteps: RouteStepRow[],
    includedStepOrders: number[],
    previewCtx: { ownerId: string | null; initiatedBy: string },
  ): Promise<SnapshotResult> {
    const roleRows = await tx
      .select({
        id: refApprovalStepRoles.id,
        code: refApprovalStepRoles.code,
        name: refApprovalStepRoles.name,
        color: refApprovalStepRoles.color,
      })
      .from(refApprovalStepRoles);
    const roleById = new Map(roleRows.map((r) => [r.id, r]));

    const result: ProcessStepRow[] = [];
    let hasApproverFinal = false;

    for (const step of routeSteps) {
      const role = step.stepRoleId ? roleById.get(step.stepRoleId) : undefined;
      const isIncluded = isStepOrderIncluded(step.stepOrder, includedStepOrders);
      if (isIncluded && role?.code === STEP_ROLE_APPROVER_FINAL) hasApproverFinal = true;

      const inserted = await tx
        .insert(approvalProcessSteps)
        .values({
          processId,
          stepOrder: step.stepOrder,
          name: step.name,
          description: step.description,
          stepType: step.stepType,
          assignmentType: step.assignmentType,
          stepRoleId: step.stepRoleId,
          stepRoleCode: role?.code ?? null,
          stepRoleName: role?.name ?? null,
          stepRoleColor: role?.color ?? null,
          isRequired: step.isRequired ?? true,
          isIncluded,
          canDelegate: step.canDelegate ?? false,
          canReturnToPrevious: step.canReturnToPrevious ?? true,
          timeLimitHours: step.timeLimitHours,
        })
        .returning({ id: approvalProcessSteps.id });
      const processStepId = inserted[0].id;

      // Снапшот назначенцев - для статичного списка (employee) и включённых шагов.
      if (isIncluded && step.assignmentType === 'employee') {
        const assignees = await tx
          .select({
            employeeId: relApprovalStepAssignees.employeeId,
            position: relApprovalStepAssignees.position,
          })
          .from(relApprovalStepAssignees)
          .where(eq(relApprovalStepAssignees.stepId, step.id));
        if (assignees.length) {
          await tx.insert(relApprovalProcessStepAssignees).values(
            assignees.map((a) => ({
              processStepId,
              employeeId: a.employeeId,
              position: a.position ?? 0,
            })),
          );
        }
      }

      // Превью для будущих шагов с предсказуемым назначением (document_owner /
      // initiator_head / owner_or_head) — чтобы в маршруте сразу было видно, кто
      // будет согласовывать, а не «назначим при переходе на шаг». Не блокирует
      // старт процесса: если сейчас не резолвится (например, у проекта нет РП),
      // просто не показываем превью, ошибка всплывёт по-старому при переходе на шаг.
      if (isIncluded && EAGERLY_RESOLVABLE_TYPES.includes(step.assignmentType)) {
        try {
          const previewed = await this.resolver.resolve(
            tx,
            { id: step.id, stepOrder: step.stepOrder, name: step.name, assignmentType: step.assignmentType },
            { initiatedBy: previewCtx.initiatedBy, runtimeData: {}, ownerId: previewCtx.ownerId },
          );
          if (previewed.length) {
            await tx.insert(relApprovalProcessStepAssignees).values(
              previewed.map((a) => ({
                processStepId,
                employeeId: a.assigneeId,
                position: a.position ?? 0,
              })),
            );
          }
        } catch (error) {
          this.logger.debug(
            `Превью назначенца шага «${step.name}» недоступно: ${error instanceof Error ? error.message : error}`,
          );
        }
      }

      result.push({
        id: processStepId,
        stepOrder: step.stepOrder,
        name: step.name,
        stepType: step.stepType,
        assignmentType: step.assignmentType,
        stepRoleCode: role?.code ?? null,
        isRequired: step.isRequired ?? true,
        isIncluded,
        canDelegate: step.canDelegate ?? false,
        canReturnToPrevious: step.canReturnToPrevious ?? true,
        timeLimitHours: step.timeLimitHours,
      });
    }

    return { steps: result, hasApproverFinal };
  }
}
