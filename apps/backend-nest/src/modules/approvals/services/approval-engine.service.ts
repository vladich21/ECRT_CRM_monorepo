import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, gt, gte, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
import type { SectionPermission } from '../../../shared/permissions';
import {
  approvalAssignments,
  approvalDecisions,
  approvalProcesses,
  approvalProcessSteps,
  approvalRouteSteps,
  approvalRoutes,
  refApprovalEntityTypes,
  tasks,
  users,
} from '../../../database/schema';
import { EntityHandlerRegistry } from '../entity-handlers/entity-handler.registry';
import type { ApprovalEntity, EntityHandler } from '../entity-handlers/entity-handler.interface';
import { AssigneeResolver } from '../resolvers/assignee.resolver';
import { ApprovalSnapshotService, type RouteStepRow } from './approval-snapshot.service';
import { ApprovalMailService } from './approval-mail.service';
import type { MakeDecisionDto, ResubmitDto } from '../dto/make-decision.dto';
import type { StartProcessDto } from '../dto/start-process.dto';
import type { ApprovalRuntimeData, DrizzleTx, PostApprovalAction } from '../types/approval.types';

/** Что разослать после коммита транзакции (§5, уведомления только после commit). */
interface NotifyIntent {
  assigned?: string[];
  finalInitiator?: string;
  revisionInitiator?: { userId: string; comment: string | null };
  rejectedInitiator?: { userId: string; comment: string | null };
}

interface ProcessRow {
  id: string;
  routeId: string;
  entityType: string;
  entityId: string;
  status: string;
  currentStepOrder: number;
  currentProcessStepId: string | null;
  initiatedBy: string;
  runtimeData: unknown;
  routeCode: string | null;
  hasApproverFinal: boolean;
  onCompleteActionsSnapshot: unknown;
}

interface StepForAssign {
  id: string;
  stepOrder: number;
  name: string;
  stepType: string;
  assignmentType: string;
}

@Injectable()
export class ApprovalEngineService {
  private readonly logger = new Logger(ApprovalEngineService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly registry: EntityHandlerRegistry,
    private readonly resolver: AssigneeResolver,
    private readonly snapshotService: ApprovalSnapshotService,
    private readonly perms: PermissionsService,
    private readonly mail: ApprovalMailService,
  ) {}

  /** Разослать уведомления после коммита (fire-and-forget). */
  private dispatchNotifications(processId: string, intent: NotifyIntent): void {
    if (intent.assigned?.length) {
      void this.mail
        .notifyAssigned(processId, intent.assigned)
        .catch((e) => this.logger.error(`notifyAssigned: ${e instanceof Error ? e.message : e}`));
    }
    if (intent.finalInitiator) {
      void this.mail
        .notifyApproved(processId, intent.finalInitiator)
        .catch((e) => this.logger.error(`notifyApproved: ${e instanceof Error ? e.message : e}`));
    }
    if (intent.revisionInitiator) {
      void this.mail
        .notifyReturnedToInitiator(processId, intent.revisionInitiator.userId, intent.revisionInitiator.comment)
        .catch((e) => this.logger.error(`notifyReturned: ${e instanceof Error ? e.message : e}`));
    }
    if (intent.rejectedInitiator) {
      void this.mail
        .notifyRejected(processId, intent.rejectedInitiator.userId, intent.rejectedInitiator.comment)
        .catch((e) => this.logger.error(`notifyRejected: ${e instanceof Error ? e.message : e}`));
    }
  }

  // ── Запуск процесса (§4.1) ──────────────────────────────────
  async startApprovalProcess(
    dto: StartProcessDto,
    userId: string,
    permissions: SectionPermission[] | undefined,
  ): Promise<{ id: string }> {
    const handler = this.registry.get(dto.entity_type);

    const result = await this.db.db.transaction(async (tx) => {
      const entity = await handler.loadEntity(dto.entity_id);
      if (!entity) throw new NotFoundException('Сущность не найдена');

      // Право на запуск: владелец ИЛИ edit-право на раздел.
      const ownerId = handler.resolveOwnerId(entity);
      const isOwner = ownerId != null && ownerId === userId;
      const canEdit = this.perms.hasSectionPermission(permissions, handler.requiredSection, 'edit');
      if (!isOwner && !canEdit) {
        throw new ForbiddenException('Недостаточно прав для запуска согласования');
      }

      handler.assertCanStartByStatus(entity);

      // Коллизия: один активный/revision процесс на сущность.
      const existing = await tx
        .select({ id: approvalProcesses.id })
        .from(approvalProcesses)
        .where(
          and(
            eq(approvalProcesses.entityType, dto.entity_type),
            eq(approvalProcesses.entityId, dto.entity_id),
            inArray(approvalProcesses.status, ['active', 'revision']),
          ),
        )
        .limit(1);
      if (existing.length) {
        throw new ConflictException('По этой сущности уже идёт согласование');
      }

      // Маршрут + шаги.
      const routeRows = await tx
        .select()
        .from(approvalRoutes)
        .where(eq(approvalRoutes.id, dto.route_id))
        .limit(1);
      const route = routeRows[0];
      if (!route || !route.isActive) throw new BadRequestException('Маршрут не найден или неактивен');

      const etRows = await tx
        .select({ code: refApprovalEntityTypes.code })
        .from(refApprovalEntityTypes)
        .where(eq(refApprovalEntityTypes.id, route.entityTypeId))
        .limit(1);
      if (etRows[0]?.code !== dto.entity_type) {
        throw new BadRequestException('Маршрут не соответствует типу сущности');
      }

      const steps = await tx
        .select()
        .from(approvalRouteSteps)
        .where(eq(approvalRouteSteps.routeId, route.id))
        .orderBy(asc(approvalRouteSteps.stepOrder));
      if (!steps.length) throw new BadRequestException('В маршруте нет шагов');

      const runtimeData: ApprovalRuntimeData = {
        step_assignees: dto.step_assignees,
        task_assignees: dto.task_assignees,
      };

      // Валидация select_on_start.
      for (const s of steps) {
        if (s.assignmentType === 'select_on_start') {
          const entry = runtimeData.step_assignees?.find((x) => x.step_order === s.stepOrder);
          if (!entry || !entry.employee_ids.length) {
            throw new BadRequestException(`Для шага «${s.name}» нужно выбрать согласующих`);
          }
        }
      }

      // Выбранные при запуске согласующие должны быть активными пользователями.
      const selectedIds = [...new Set((runtimeData.step_assignees ?? []).flatMap((s) => s.employee_ids))];
      if (selectedIds.length) {
        const activeRows = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(inArray(users.id, selectedIds), eq(users.isActive, true)));
        if (activeRows.length !== selectedIds.length) {
          throw new BadRequestException('Среди выбранных согласующих есть неактивные или несуществующие пользователи');
        }
      }

      // INSERT процесса.
      const insertedProc = await tx
        .insert(approvalProcesses)
        .values({
          routeId: route.id,
          entityType: dto.entity_type,
          entityId: dto.entity_id,
          status: 'active',
          currentStepOrder: 1,
          initiatedBy: userId,
          runtimeData,
        })
        .returning({ id: approvalProcesses.id });
      const processId = insertedProc[0].id;

      // Снапшот маршрута (§4.0).
      const snap = await this.snapshotService.snapshot(tx, processId, steps as RouteStepRow[]);
      const step1 = snap.steps.find((s) => s.stepOrder === 1) ?? snap.steps[0];

      await tx
        .update(approvalProcesses)
        .set({
          routeCode: route.code,
          hasApproverFinal: snap.hasApproverFinal,
          onCompleteActionsSnapshot: route.onCompleteActions,
          currentProcessStepId: step1.id,
          currentStepOrder: step1.stepOrder,
          updatedAt: new Date(),
        })
        .where(eq(approvalProcesses.id, processId));

      // Назначения шага 1.
      const assigned = await this.createAssignmentsForStep(
        tx,
        processId,
        userId,
        runtimeData,
        handler,
        entity,
        step1,
      );

      // Статус сущности.
      await handler.onStart(tx, entity);

      this.logger.log(`Запущен процесс ${processId} (${dto.entity_type}/${dto.entity_id})`);
      return { id: processId, intent: { assigned } as NotifyIntent };
    });

    this.dispatchNotifications(result.id, result.intent);
    return { id: result.id };
  }

  // ── Принятие решения (§4.4) ─────────────────────────────────
  async makeDecision(processId: string, dto: MakeDecisionDto, userId: string): Promise<{ id: string }> {
    const result = await this.db.db.transaction(async (tx) => {
      const procRows = await tx
        .select()
        .from(approvalProcesses)
        .where(eq(approvalProcesses.id, processId))
        .for('update')
        .limit(1);
      const process = procRows[0] as ProcessRow | undefined;
      if (!process) throw new NotFoundException('Процесс не найден');
      if (process.status !== 'active') throw new BadRequestException('Процесс не в активном статусе');

      const currentStep = await this.loadProcessStepByOrder(tx, processId, process.currentStepOrder);
      if (!currentStep) throw new BadRequestException('Текущий шаг не найден в снапшоте');

      const myAssignment = await tx
        .select({ id: approvalAssignments.id })
        .from(approvalAssignments)
        .where(
          and(
            eq(approvalAssignments.processId, processId),
            eq(approvalAssignments.stepOrder, process.currentStepOrder),
            eq(approvalAssignments.assigneeId, userId),
            eq(approvalAssignments.isPending, true),
            eq(approvalAssignments.isActive, true),
          ),
        )
        .limit(1);
      if (!myAssignment.length) {
        throw new ForbiddenException('Вы не являетесь активным согласующим текущего шага');
      }

      // Guard-флаги шага.
      if (dto.decision_type === 'returned_to_step' && !currentStep.canReturnToPrevious) {
        throw new ForbiddenException('Возврат на предыдущий шаг запрещён для этого шага');
      }
      if (dto.decision_type === 'delegated' && !currentStep.canDelegate) {
        throw new ForbiddenException('Делегирование запрещено для этого шага');
      }
      this.validateDecisionPayload(dto, process.currentStepOrder);

      // Журнал решения.
      await tx.insert(approvalDecisions).values({
        processId,
        stepOrder: process.currentStepOrder,
        processStepId: currentStep.id,
        decidedBy: userId,
        decisionType: dto.decision_type,
        delegatedTo: dto.delegated_to ?? null,
        returnToStep: dto.return_to_step ?? null,
        comment: dto.comment ?? null,
      });

      // Снимаем pending (кроме delegated — это делает handleDelegation).
      if (dto.decision_type !== 'delegated') {
        await tx
          .update(approvalAssignments)
          .set({ isPending: false })
          .where(
            and(
              eq(approvalAssignments.processId, processId),
              eq(approvalAssignments.stepOrder, process.currentStepOrder),
              eq(approvalAssignments.assigneeId, userId),
            ),
          );
      }

      const handler = this.registry.get(process.entityType);
      const entity = await handler.loadEntity(process.entityId);
      if (!entity) throw new NotFoundException('Сущность согласования не найдена');

      let intent: NotifyIntent = {};
      switch (dto.decision_type) {
        case 'approved':
          intent = await this.handleApproval(tx, process, currentStep, userId, handler, entity);
          break;
        case 'rejected':
          intent = await this.handleRejection(tx, process, userId, dto.comment ?? null, handler, entity);
          break;
        case 'returned_to_step':
          intent = await this.handleReturnToStep(tx, process, dto.return_to_step!, handler, entity);
          break;
        case 'returned_to_initiator':
          intent = await this.handleReturnToInitiator(tx, process, dto.comment ?? null, handler, entity);
          break;
        case 'delegated':
          intent = await this.handleDelegation(tx, process, currentStep, dto, userId);
          break;
      }

      return { id: processId, intent };
    });

    this.dispatchNotifications(result.id, result.intent);
    return { id: result.id };
  }

  // ── Повторная отправка после revision (§4.5) ────────────────
  async resubmit(processId: string, dto: ResubmitDto, userId: string): Promise<{ id: string }> {
    const result = await this.db.db.transaction(async (tx) => {
      const procRows = await tx
        .select()
        .from(approvalProcesses)
        .where(eq(approvalProcesses.id, processId))
        .for('update')
        .limit(1);
      const process = procRows[0] as ProcessRow | undefined;
      if (!process) throw new NotFoundException('Процесс не найден');
      if (process.status !== 'revision') throw new BadRequestException('Процесс не в статусе доработки');
      if (process.initiatedBy !== userId) throw new ForbiddenException('Только инициатор может повторно отправить');

      const step1 = await this.loadProcessStepByOrder(tx, processId, 1);
      if (!step1) throw new BadRequestException('Шаг 1 не найден в снапшоте');

      await tx
        .update(approvalProcesses)
        .set({
          status: 'active',
          currentStepOrder: 1,
          currentProcessStepId: step1.id,
          completionComment: dto.comment ?? null,
          updatedAt: new Date(),
        })
        .where(eq(approvalProcesses.id, processId));

      const handler = this.registry.get(process.entityType);
      const entity = await handler.loadEntity(process.entityId);
      if (!entity) throw new NotFoundException('Сущность согласования не найдена');

      const runtimeData = (process.runtimeData ?? {}) as ApprovalRuntimeData;
      const assigned = await this.createAssignmentsForStep(
        tx,
        processId,
        process.initiatedBy,
        runtimeData,
        handler,
        entity,
        step1,
      );
      await handler.onStart(tx, entity);

      return { id: processId, intent: { assigned } as NotifyIntent };
    });

    this.dispatchNotifications(result.id, result.intent);
    return { id: result.id };
  }

  // ── Отмена инициатором ──────────────────────────────────────
  async cancel(processId: string, comment: string | undefined, userId: string): Promise<{ id: string }> {
    return this.db.db.transaction(async (tx) => {
      const procRows = await tx
        .select()
        .from(approvalProcesses)
        .where(eq(approvalProcesses.id, processId))
        .for('update')
        .limit(1);
      const process = procRows[0] as ProcessRow | undefined;
      if (!process) throw new NotFoundException('Процесс не найден');
      if (process.initiatedBy !== userId) throw new ForbiddenException('Только инициатор может отменить');
      if (!['active', 'revision'].includes(process.status)) {
        throw new BadRequestException('Процесс уже завершён');
      }

      await tx
        .update(approvalProcesses)
        .set({
          status: 'cancelled',
          completedAt: new Date(),
          completedBy: userId,
          completionComment: comment ?? null,
          updatedAt: new Date(),
        })
        .where(eq(approvalProcesses.id, processId));

      await tx
        .update(approvalAssignments)
        .set({ isActive: false })
        .where(and(eq(approvalAssignments.processId, processId), eq(approvalAssignments.isPending, true)));

      const handler = this.registry.get(process.entityType);
      const entity = await handler.loadEntity(process.entityId);
      if (entity) await handler.onCancel(tx, entity);

      return { id: processId };
    });
  }

  // ── Диспетчеры решений (§4.5) ───────────────────────────────
  private async handleApproval(
    tx: DrizzleTx,
    process: ProcessRow,
    currentStep: StepSnapshot,
    userId: string,
    handler: EntityHandler,
    entity: ApprovalEntity,
  ): Promise<NotifyIntent> {
    if (currentStep.stepType === 'sequential') {
      const activePending = await this.countActivePending(tx, process.id, process.currentStepOrder);
      if (activePending > 0) return {}; // ждём (например, добавленного соисполнителя)

      const sleeping = await tx
        .select({ id: approvalAssignments.id, assigneeId: approvalAssignments.assigneeId })
        .from(approvalAssignments)
        .where(
          and(
            eq(approvalAssignments.processId, process.id),
            eq(approvalAssignments.stepOrder, process.currentStepOrder),
            eq(approvalAssignments.isPending, true),
            eq(approvalAssignments.isActive, false),
          ),
        )
        .orderBy(asc(approvalAssignments.position))
        .limit(1);

      if (sleeping.length) {
        await tx
          .update(approvalAssignments)
          .set({ isActive: true, createdAt: new Date(), reminderSentAt: null, overdueNotifiedAt: null })
          .where(eq(approvalAssignments.id, sleeping[0].id));
        return { assigned: [sleeping[0].assigneeId] }; // активирован следующий
      }
      return this.advanceOrFinish(tx, process, userId, handler, entity);
    }

    // any / all
    const pendingCount = await this.countActivePending(tx, process.id, process.currentStepOrder);
    const completed = currentStep.stepType === 'any' || pendingCount === 0;
    if (!completed) return {};

    if (currentStep.stepType === 'any') {
      await tx
        .update(approvalAssignments)
        .set({ isActive: false })
        .where(
          and(
            eq(approvalAssignments.processId, process.id),
            eq(approvalAssignments.stepOrder, process.currentStepOrder),
            eq(approvalAssignments.isPending, true),
            eq(approvalAssignments.isActive, true),
          ),
        );
    }
    return this.advanceOrFinish(tx, process, userId, handler, entity);
  }

  private async advanceOrFinish(
    tx: DrizzleTx,
    process: ProcessRow,
    userId: string,
    handler: EntityHandler,
    entity: ApprovalEntity,
  ): Promise<NotifyIntent> {
    const nextRows = await tx
      .select()
      .from(approvalProcessSteps)
      .where(
        and(
          eq(approvalProcessSteps.processId, process.id),
          gt(approvalProcessSteps.stepOrder, process.currentStepOrder),
        ),
      )
      .orderBy(asc(approvalProcessSteps.stepOrder))
      .limit(1);

    if (nextRows.length) {
      const next = nextRows[0];
      await tx
        .update(approvalProcesses)
        .set({ currentStepOrder: next.stepOrder, currentProcessStepId: next.id, updatedAt: new Date() })
        .where(eq(approvalProcesses.id, process.id));
      const runtimeData = (process.runtimeData ?? {}) as ApprovalRuntimeData;
      const assigned = await this.createAssignmentsForStep(
        tx,
        process.id,
        process.initiatedBy,
        runtimeData,
        handler,
        entity,
        next,
      );
      return { assigned };
    }

    // Финал.
    const status = process.hasApproverFinal ? 'ratified' : 'approved';
    await tx
      .update(approvalProcesses)
      .set({ status, completedAt: new Date(), completedBy: userId, updatedAt: new Date() })
      .where(eq(approvalProcesses.id, process.id));
    await handler.onApproveFinal(tx, entity);
    await this.executePostApprovalActions(tx, process, entity, handler);
    this.logger.log(`Процесс ${process.id} завершён со статусом ${status}`);
    return { finalInitiator: process.initiatedBy };
  }

  private async handleRejection(
    tx: DrizzleTx,
    process: ProcessRow,
    userId: string,
    comment: string | null,
    handler: EntityHandler,
    entity: ApprovalEntity,
  ): Promise<NotifyIntent> {
    await tx
      .update(approvalProcesses)
      .set({
        status: 'rejected',
        completedAt: new Date(),
        completedBy: userId,
        completionComment: comment,
        updatedAt: new Date(),
      })
      .where(eq(approvalProcesses.id, process.id));
    await tx
      .update(approvalAssignments)
      .set({ isActive: false })
      .where(
        and(
          eq(approvalAssignments.processId, process.id),
          eq(approvalAssignments.stepOrder, process.currentStepOrder),
          eq(approvalAssignments.isPending, true),
        ),
      );
    await handler.onReject(tx, entity);
    return { rejectedInitiator: { userId: process.initiatedBy, comment } };
  }

  private async handleReturnToStep(
    tx: DrizzleTx,
    process: ProcessRow,
    targetStepOrder: number,
    handler: EntityHandler,
    entity: ApprovalEntity,
  ): Promise<NotifyIntent> {
    if (targetStepOrder >= process.currentStepOrder) {
      throw new BadRequestException('Возврат возможен только на предыдущий шаг');
    }
    const target = await this.loadProcessStepByOrder(tx, process.id, targetStepOrder);
    if (!target) throw new BadRequestException('Целевой шаг не найден');

    await tx
      .update(approvalAssignments)
      .set({ isActive: false })
      .where(
        and(eq(approvalAssignments.processId, process.id), gte(approvalAssignments.stepOrder, targetStepOrder)),
      );

    await tx
      .update(approvalProcesses)
      .set({ currentStepOrder: targetStepOrder, currentProcessStepId: target.id, updatedAt: new Date() })
      .where(eq(approvalProcesses.id, process.id));

    const runtimeData = (process.runtimeData ?? {}) as ApprovalRuntimeData;
    const assigned = await this.createAssignmentsForStep(
      tx,
      process.id,
      process.initiatedBy,
      runtimeData,
      handler,
      entity,
      target,
    );
    return { assigned };
  }

  private async handleReturnToInitiator(
    tx: DrizzleTx,
    process: ProcessRow,
    comment: string | null,
    handler: EntityHandler,
    entity: ApprovalEntity,
  ): Promise<NotifyIntent> {
    await tx
      .update(approvalProcesses)
      .set({ status: 'revision', completionComment: comment, updatedAt: new Date() })
      .where(eq(approvalProcesses.id, process.id));
    await tx
      .update(approvalAssignments)
      .set({ isActive: false })
      .where(and(eq(approvalAssignments.processId, process.id), eq(approvalAssignments.isPending, true)));
    await handler.onReturnToInitiator(tx, entity);
    return { revisionInitiator: { userId: process.initiatedBy, comment } };
  }

  private async handleDelegation(
    tx: DrizzleTx,
    process: ProcessRow,
    currentStep: StepSnapshot,
    dto: MakeDecisionDto,
    userId: string,
  ): Promise<NotifyIntent> {
    const delegatedTo = dto.delegated_to;
    if (!delegatedTo) throw new BadRequestException('Не указан делегат');
    if (delegatedTo === userId) throw new BadRequestException('Нельзя делегировать самому себе');

    const delegate = await tx
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, delegatedTo), eq(users.isActive, true)))
      .limit(1);
    if (!delegate.length) throw new BadRequestException('Делегат не найден или неактивен');

    const mode = dto.delegation_mode ?? 'transfer';

    // UPSERT / реактивация назначения делегата.
    await tx
      .insert(approvalAssignments)
      .values({
        processId: process.id,
        stepOrder: process.currentStepOrder,
        processStepId: currentStep.id,
        assigneeId: delegatedTo,
        sourceType: 'employee',
        isPending: true,
        isActive: true,
        position: 0,
        reminderSentAt: null,
        overdueNotifiedAt: null,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          approvalAssignments.processId,
          approvalAssignments.stepOrder,
          approvalAssignments.assigneeId,
        ],
        set: {
          processStepId: currentStep.id,
          sourceType: 'employee',
          isPending: true,
          isActive: true,
          reminderSentAt: null,
          overdueNotifiedAt: null,
          createdAt: new Date(),
        },
      });

    if (mode === 'transfer') {
      await tx
        .update(approvalAssignments)
        .set({ isPending: false, isActive: false })
        .where(
          and(
            eq(approvalAssignments.processId, process.id),
            eq(approvalAssignments.stepOrder, process.currentStepOrder),
            eq(approvalAssignments.assigneeId, userId),
          ),
        );
    }
    // mode='add' — делегирующий остаётся pending (в makeDecision pending не сбрасывали).
    return { assigned: [delegatedTo] };
  }

  // ── Создание назначений шага (§4.3) ─────────────────────────
  private async createAssignmentsForStep(
    tx: DrizzleTx,
    processId: string,
    initiatedBy: string,
    runtimeData: ApprovalRuntimeData,
    handler: EntityHandler,
    entity: ApprovalEntity,
    step: StepForAssign,
  ): Promise<string[]> {
    const ownerId = step.assignmentType === 'document_owner' ? handler.resolveOwnerId(entity) : null;
    const resolved = await this.resolver.resolve(
      tx,
      { id: step.id, stepOrder: step.stepOrder, name: step.name, assignmentType: step.assignmentType },
      { initiatedBy, runtimeData, ownerId },
    );

    const minPos = Math.min(...resolved.map((r) => r.position));
    const activated: string[] = [];

    for (const r of resolved) {
      const isActive = step.stepType === 'sequential' ? r.position === minPos : true;
      if (isActive) activated.push(r.assigneeId);
      await tx
        .insert(approvalAssignments)
        .values({
          processId,
          stepOrder: step.stepOrder,
          processStepId: step.id,
          assigneeId: r.assigneeId,
          sourceType: r.sourceType,
          isPending: true,
          isActive,
          position: r.position,
          reminderSentAt: null,
          overdueNotifiedAt: null,
          createdAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            approvalAssignments.processId,
            approvalAssignments.stepOrder,
            approvalAssignments.assigneeId,
          ],
          set: {
            processStepId: step.id,
            sourceType: r.sourceType,
            isPending: true,
            isActive,
            position: r.position,
            reminderSentAt: null,
            overdueNotifiedAt: null,
            createdAt: new Date(),
          },
        });
    }
    return activated;
  }

  // ── Вспомогательные ─────────────────────────────────────────
  private async loadProcessStepByOrder(
    tx: DrizzleTx,
    processId: string,
    stepOrder: number,
  ): Promise<StepSnapshot | null> {
    const rows = await tx
      .select({
        id: approvalProcessSteps.id,
        stepOrder: approvalProcessSteps.stepOrder,
        stepType: approvalProcessSteps.stepType,
        assignmentType: approvalProcessSteps.assignmentType,
        name: approvalProcessSteps.name,
        canDelegate: approvalProcessSteps.canDelegate,
        canReturnToPrevious: approvalProcessSteps.canReturnToPrevious,
      })
      .from(approvalProcessSteps)
      .where(and(eq(approvalProcessSteps.processId, processId), eq(approvalProcessSteps.stepOrder, stepOrder)))
      .limit(1);
    return rows[0] ?? null;
  }

  private async countActivePending(tx: DrizzleTx, processId: string, stepOrder: number): Promise<number> {
    const rows = await tx
      .select({ c: sql<number>`count(*)::int` })
      .from(approvalAssignments)
      .where(
        and(
          eq(approvalAssignments.processId, processId),
          eq(approvalAssignments.stepOrder, stepOrder),
          eq(approvalAssignments.isPending, true),
          eq(approvalAssignments.isActive, true),
        ),
      );
    return rows[0]?.c ?? 0;
  }

  private validateDecisionPayload(dto: MakeDecisionDto, currentStepOrder: number): void {
    if (dto.decision_type === 'rejected' && !dto.comment?.trim()) {
      throw new BadRequestException('Для отклонения нужен комментарий');
    }
    if (dto.decision_type === 'returned_to_initiator' && !dto.comment?.trim()) {
      throw new BadRequestException('Для возврата на доработку нужен комментарий');
    }
    if (dto.decision_type === 'returned_to_step') {
      if (!dto.comment?.trim()) throw new BadRequestException('Для возврата на шаг нужен комментарий');
      if (dto.return_to_step == null || dto.return_to_step >= currentStepOrder) {
        throw new BadRequestException('Некорректный номер шага для возврата');
      }
    }
    if (dto.decision_type === 'delegated' && !dto.delegated_to) {
      throw new BadRequestException('Не указан делегат');
    }
  }

  // ── Действия после успеха (§4.7, F5) ────────────────────────
  private async executePostApprovalActions(
    tx: DrizzleTx,
    process: ProcessRow,
    entity: ApprovalEntity,
    handler: EntityHandler,
  ): Promise<void> {
    const actions = (process.onCompleteActionsSnapshot ?? []) as PostApprovalAction[];
    if (!Array.isArray(actions) || actions.length === 0) return;

    const runtimeData = (process.runtimeData ?? {}) as ApprovalRuntimeData;
    const ctx = handler.resolveContext(entity);

    for (const action of actions) {
      if (action.action_type !== 'create_task') continue;
      const cfg = action.task_config;
      const assigneeId = await this.resolveTaskAssignee(tx, action, process, entity, handler, runtimeData);
      if (!assigneeId) {
        this.logger.warn(`Задача "${action.id}" пропущена: не определён исполнитель`);
        continue;
      }
      const dueDate = new Date(Date.now() + (cfg.due_days ?? 0) * 86_400_000);
      await tx.insert(tasks).values({
        entityType: process.entityType,
        entityId: process.entityId,
        taskType: 'post_approval',
        sourceType: 'approval_process',
        sourceId: process.id,
        title: this.applyTemplate(cfg.title_template, ctx),
        description: cfg.description_template ? this.applyTemplate(cfg.description_template, ctx) : null,
        assigneeId,
        dueDate,
        priority: cfg.priority ?? 'normal',
        status: 'open',
      });
    }
  }

  private applyTemplate(tpl: string, ctx: { number?: string; title?: string; type?: string }): string {
    return tpl
      .replaceAll('{number}', ctx.number ?? '')
      .replaceAll('{title}', ctx.title ?? '')
      .replaceAll('{type}', ctx.type ?? '');
  }

  private async resolveTaskAssignee(
    tx: DrizzleTx,
    action: PostApprovalAction,
    process: ProcessRow,
    entity: ApprovalEntity,
    handler: EntityHandler,
    runtimeData: ApprovalRuntimeData,
  ): Promise<string | null> {
    const cfg = action.task_config;
    switch (cfg.assignee_type) {
      case 'specific_employee':
        return cfg.assignee_id ?? null;
      case 'initiator':
        return process.initiatedBy;
      case 'initiator_head':
        return (await this.resolver.findSupervisor(tx, process.initiatedBy)) ?? process.initiatedBy;
      case 'document_owner':
        return handler.resolveOwnerId(entity) ?? process.initiatedBy;
      case 'select_on_start':
        return runtimeData.task_assignees?.find((t) => t.action_id === action.id)?.employee_id ?? null;
      default:
        return null;
    }
  }

}

interface StepSnapshot {
  id: string;
  stepOrder: number;
  stepType: string;
  assignmentType: string;
  name: string;
  canDelegate: boolean;
  canReturnToPrevious: boolean;
}
