import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
import type { SectionPermission } from '../../../shared/permissions';
import {
  approvalAssignments,
  approvalDecisions,
  approvalEvents,
  approvalProcesses,
  approvalProcessSteps,
  approvalRoutes,
  relApprovalProcessStepAssignees,
  users,
} from '../../../database/schema';
import { EntityHandlerRegistry } from '../entity-handlers/entity-handler.registry';
import { ApprovalRoutesService } from './approval-routes.service';

const ACTIVE_STATUSES = ['active', 'revision'];
const COMPLETED_STATUSES = ['approved', 'ratified', 'rejected', 'cancelled'];

@Injectable()
export class ApprovalStateService {
  constructor(
    private readonly db: DatabaseService,
    private readonly registry: EntityHandlerRegistry,
    private readonly perms: PermissionsService,
    private readonly routesService: ApprovalRoutesService,
  ) {}

  // ── Единая точка для UI (§3.4) ──────────────────────────────
  async getDocumentApprovalState(
    entityType: string,
    entityId: string,
    userId: string,
    permissions: SectionPermission[] | undefined,
  ) {
    const supported = this.registry.has(entityType);

    const activeRows = await this.db.db
      .select()
      .from(approvalProcesses)
      .where(
        and(
          eq(approvalProcesses.entityType, entityType),
          eq(approvalProcesses.entityId, entityId),
          inArray(approvalProcesses.status, ACTIVE_STATUSES),
        ),
      )
      .limit(1);
    const active = activeRows[0];

    let canStart = false;
    let documentStatus: string | null = null;
    let availableRoutes: unknown[] = [];
    let canReadEntity = false;
    let isOwner = false;

    if (supported) {
      const handler = this.registry.get(entityType);
      canReadEntity = this.perms.hasSectionPermission(permissions, handler.requiredSection, 'read');
      const entity = await handler.loadEntity(entityId);
      if (entity) {
        documentStatus =
          (entity.stateCode as string | null) ??
          (entity.status as string | null) ??
          (entity.statusId as string | null) ??
          null;
        const ownerId = handler.resolveOwnerId(entity);
        isOwner = ownerId != null && ownerId === userId;
        const canEdit = this.perms.hasSectionPermission(permissions, handler.requiredSection, 'edit');
        let statusOk = true;
        try {
          handler.assertCanStartByStatus(entity);
        } catch {
          statusOk = false;
        }
        // Повторный запуск разрешён только после отклонения/отмены: если последнее
        // согласование завершилось успешно (approved/ratified) — карточка терминальна.
        const lastDone = await this.db.db
          .select({ status: approvalProcesses.status })
          .from(approvalProcesses)
          .where(
            and(
              eq(approvalProcesses.entityType, entityType),
              eq(approvalProcesses.entityId, entityId),
              inArray(approvalProcesses.status, COMPLETED_STATUSES),
            ),
          )
          .orderBy(desc(approvalProcesses.completedAt))
          .limit(1);
        const lockedByApproved = lastDone[0]?.status === 'approved' || lastDone[0]?.status === 'ratified';
        canStart = !active && statusOk && !lockedByApproved && (isOwner || canEdit);
      }
      availableRoutes = await this.routesService.availableRoutes(entityType);
    }

    // Доступ: право на чтение раздела сущности ИЛИ владелец ИЛИ участник процесса.
    const isParticipant = active
      ? active.initiatedBy === userId || (await this.isAssignee(active.id, userId))
      : false;
    const canView = canReadEntity || isOwner || isParticipant;
    if (!canView) {
      return {
        has_active_process: false,
        can_start_approval: false,
        can_approve: false,
        can_cancel: false,
        can_resubmit: false,
        available_routes: [],
        document_status: null,
      };
    }

    let process: unknown;
    let myPending: unknown;
    let canApprove = false;
    if (active) {
      process = await this.getProcessWithDetails(active.id);
      if (active.status === 'active') {
        const mine = await this.db.db
          .select()
          .from(approvalAssignments)
          .where(
            and(
              eq(approvalAssignments.processId, active.id),
              eq(approvalAssignments.stepOrder, active.currentStepOrder),
              eq(approvalAssignments.assigneeId, userId),
              eq(approvalAssignments.isPending, true),
              eq(approvalAssignments.isActive, true),
            ),
          )
          .limit(1);
        myPending = mine[0];
        canApprove = mine.length > 0;
      }
    }

    // Историю завершённых показываем только тем, у кого есть read на раздел сущности.
    const completed = canReadEntity
      ? await this.db.db
          .select()
          .from(approvalProcesses)
          .where(
            and(
              eq(approvalProcesses.entityType, entityType),
              eq(approvalProcesses.entityId, entityId),
              inArray(approvalProcesses.status, COMPLETED_STATUSES),
            ),
          )
          .orderBy(desc(approvalProcesses.completedAt))
          .limit(10)
      : [];

    // Нет активного, но есть завершённые → показываем последний (с историей/листом).
    if (!active && !process && completed.length > 0) {
      process = await this.getProcessWithDetails(completed[0].id);
    }

    const isInitiator = active?.initiatedBy === userId;

    return {
      has_active_process: !!active,
      process,
      can_start_approval: canStart,
      can_approve: canApprove,
      can_cancel: !!active && isInitiator,
      can_resubmit: !!active && isInitiator && active.status === 'revision',
      my_pending_assignment: myPending,
      available_routes: availableRoutes,
      // Архив: компактные summary завершённых процессов (детали — по запросу GET /processes/:id).
      completed_processes: completed.map((c) => ({
        id: c.id,
        status: c.status,
        initiated_at: c.initiatedAt,
        completed_at: c.completedAt,
        completion_comment: c.completionComment ?? null,
      })),
      document_status: documentStatus,
    };
  }

  // ── Процесс с деталями (шаги/назначения/решения) ────────────
  async getProcessWithDetails(processId: string) {
    const procRows = await this.db.db
      .select({
        id: approvalProcesses.id,
        routeId: approvalProcesses.routeId,
        routeCode: approvalProcesses.routeCode,
        routeName: approvalRoutes.name,
        entityType: approvalProcesses.entityType,
        entityId: approvalProcesses.entityId,
        status: approvalProcesses.status,
        currentStepOrder: approvalProcesses.currentStepOrder,
        currentProcessStepId: approvalProcesses.currentProcessStepId,
        initiatedBy: approvalProcesses.initiatedBy,
        initiatedAt: approvalProcesses.initiatedAt,
        completedAt: approvalProcesses.completedAt,
        completedBy: approvalProcesses.completedBy,
        completionComment: approvalProcesses.completionComment,
        hasApproverFinal: approvalProcesses.hasApproverFinal,
      })
      .from(approvalProcesses)
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .where(eq(approvalProcesses.id, processId))
      .limit(1);
    const process = procRows[0];
    if (!process) return null;

    const steps = await this.db.db
      .select()
      .from(approvalProcessSteps)
      .where(eq(approvalProcessSteps.processId, processId))
      .orderBy(approvalProcessSteps.stepOrder);

    const assignments = await this.db.db
      .select()
      .from(approvalAssignments)
      .where(eq(approvalAssignments.processId, processId));

    // Снапшот плановых назначенцев шагов: для будущих (pending) шагов строк в
    // approval_assignments ещё нет (создаются при переходе на шаг), поэтому
    // участников показываем из снапшота маршрута.
    const stepIds = steps.map((s) => s.id);
    const snapshotAssignees = stepIds.length
      ? await this.db.db
          .select()
          .from(relApprovalProcessStepAssignees)
          .where(inArray(relApprovalProcessStepAssignees.processStepId, stepIds))
      : [];

    const decisions = await this.db.db
      .select()
      .from(approvalDecisions)
      .where(eq(approvalDecisions.processId, processId))
      .orderBy(approvalDecisions.decidedAt);

    const events = await this.db.db
      .select()
      .from(approvalEvents)
      .where(eq(approvalEvents.processId, processId))
      .orderBy(approvalEvents.createdAt);

    const userIds = new Set<string>();
    assignments.forEach((a) => userIds.add(a.assigneeId));
    snapshotAssignees.forEach((a) => userIds.add(a.employeeId));
    decisions.forEach((d) => {
      userIds.add(d.decidedBy);
      if (d.delegatedTo) userIds.add(d.delegatedTo);
    });
    events.forEach((e) => {
      if (e.actorId) userIds.add(e.actorId);
    });
    userIds.add(process.initiatedBy);
    const names = await this.getUserNames([...userIds]);

    const now = Date.now();
    const stepsWithProgress = steps.map((s) => {
      const stepAssignments = assignments.filter((a) => a.stepOrder === s.stepOrder);
      const isCurrent = s.stepOrder === process.currentStepOrder && process.status === 'active';
      const isFinalApproved = process.status === 'approved' || process.status === 'ratified';

      let state: 'completed' | 'current' | 'pending' = 'pending';
      if (isFinalApproved || s.stepOrder < process.currentStepOrder) state = 'completed';
      else if (isCurrent) state = 'current';

      // Плановые назначенцы из снапшота (используются, когда боевых назначений
      // ещё нет — т.е. для будущих шагов).
      const snap = snapshotAssignees
        .filter((a) => a.processStepId === s.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const usePlanned = stepAssignments.length === 0 && snap.length > 0;

      // SLA для текущего шага.
      let isOverdue = false;
      let deadlineAt: string | null = null;
      if (isCurrent && s.timeLimitHours) {
        const activePending = stepAssignments.filter((a) => a.isPending && a.isActive);
        for (const a of activePending) {
          const created = a.createdAt ? new Date(a.createdAt).getTime() : null;
          if (created != null) {
            const dl = created + s.timeLimitHours * 3600_000;
            deadlineAt = new Date(dl).toISOString();
            if (now > dl) isOverdue = true;
          }
        }
      }

      // Очередь sequential.
      let sequentialQueue: { id: string; name: string; state: 'done' | 'active' | 'waiting' }[] | undefined;
      if (s.stepType === 'sequential') {
        sequentialQueue = usePlanned
          ? snap.map((a) => ({
              id: a.employeeId,
              name: names.get(a.employeeId) ?? a.employeeId,
              state: 'waiting' as const,
            }))
          : [...stepAssignments]
              .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((a) => ({
                id: a.assigneeId,
                name: names.get(a.assigneeId) ?? a.assigneeId,
                state: !a.isPending ? 'done' : a.isActive ? 'active' : 'waiting',
              }));
      }

      return {
        id: s.id,
        step_order: s.stepOrder,
        name: s.name,
        description: s.description,
        step_type: s.stepType,
        step_role_code: s.stepRoleCode,
        step_role_name: s.stepRoleName,
        step_role_color: s.stepRoleColor,
        can_delegate: s.canDelegate,
        can_return_to_previous: s.canReturnToPrevious,
        state,
        is_overdue: isOverdue,
        deadline_at: deadlineAt,
        sequential_queue: sequentialQueue,
        assignees: usePlanned
          ? snap.map((a) => ({
              assignee_id: a.employeeId,
              name: names.get(a.employeeId) ?? a.employeeId,
              is_pending: true,
              is_active: false,
              source_type: 'planned',
            }))
          : stepAssignments.map((a) => ({
              assignee_id: a.assigneeId,
              name: names.get(a.assigneeId) ?? a.assigneeId,
              is_pending: a.isPending,
              is_active: a.isActive,
              source_type: a.sourceType,
            })),
      };
    });

    return {
      id: process.id,
      route_id: process.routeId,
      route_code: process.routeCode,
      route_name: process.routeName,
      entity_type: process.entityType,
      entity_id: process.entityId,
      status: process.status,
      current_step_order: process.currentStepOrder,
      current_process_step_id: process.currentProcessStepId,
      initiated_by: process.initiatedBy,
      initiator_name: names.get(process.initiatedBy) ?? null,
      initiated_at: process.initiatedAt,
      completed_at: process.completedAt,
      completed_by: process.completedBy,
      completion_comment: process.completionComment,
      has_approver_final: process.hasApproverFinal,
      steps: stepsWithProgress,
      decisions: decisions.map((d) => ({
        id: d.id,
        step_order: d.stepOrder,
        decided_by: d.decidedBy,
        decided_by_name: names.get(d.decidedBy) ?? d.decidedBy,
        decision_type: d.decisionType,
        delegated_to: d.delegatedTo,
        delegated_to_name: d.delegatedTo ? names.get(d.delegatedTo) ?? d.delegatedTo : null,
        return_to_step: d.returnToStep,
        comment: d.comment,
        decided_at: d.decidedAt,
      })),
      events: events.map((e) => ({
        id: e.id,
        event_type: e.eventType,
        actor_id: e.actorId,
        actor_name: e.actorId ? names.get(e.actorId) ?? e.actorId : null,
        created_at: e.createdAt,
      })),
    };
  }

  /** Проверка причастности: есть ли у пользователя назначение в процессе. */
  private async isAssignee(processId: string, userId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: approvalAssignments.id })
      .from(approvalAssignments)
      .where(and(eq(approvalAssignments.processId, processId), eq(approvalAssignments.assigneeId, userId)))
      .limit(1);
    return rows.length > 0;
  }

  /** Процесс с проверкой доступа (инициатор / участник / read на раздел сущности). */
  async getProcessForUser(processId: string, userId: string, permissions: SectionPermission[] | undefined) {
    const procRows = await this.db.db
      .select({
        entityType: approvalProcesses.entityType,
        initiatedBy: approvalProcesses.initiatedBy,
      })
      .from(approvalProcesses)
      .where(eq(approvalProcesses.id, processId))
      .limit(1);
    const p = procRows[0];
    if (!p) throw new NotFoundException('Процесс не найден');

    const canReadEntity =
      this.registry.has(p.entityType) &&
      this.perms.hasSectionPermission(permissions, this.registry.get(p.entityType).requiredSection, 'read');
    const participant = p.initiatedBy === userId || (await this.isAssignee(processId, userId));
    if (!canReadEntity && !participant) {
      throw new ForbiddenException('Нет доступа к процессу согласования');
    }
    return this.getProcessWithDetails(processId);
  }

  // ── Инбоксы ─────────────────────────────────────────────────
  async myTasks(userId: string) {
    return this.db.db
      .select({
        process_id: approvalProcesses.id,
        entity_type: approvalProcesses.entityType,
        entity_id: approvalProcesses.entityId,
        route_name: approvalRoutes.name,
        current_step_order: approvalProcesses.currentStepOrder,
        step_name: approvalProcessSteps.name,
        initiated_at: approvalProcesses.initiatedAt,
      })
      .from(approvalAssignments)
      .innerJoin(approvalProcesses, eq(approvalAssignments.processId, approvalProcesses.id))
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .leftJoin(approvalProcessSteps, eq(approvalAssignments.processStepId, approvalProcessSteps.id))
      .where(
        and(
          eq(approvalAssignments.assigneeId, userId),
          eq(approvalAssignments.isPending, true),
          eq(approvalAssignments.isActive, true),
          eq(approvalProcesses.status, 'active'),
        ),
      )
      .orderBy(desc(approvalProcesses.initiatedAt));
  }

  async myTasksCount(userId: string): Promise<number> {
    const rows = await this.db.db
      .select({ c: sql<number>`count(*)::int` })
      .from(approvalAssignments)
      .innerJoin(approvalProcesses, eq(approvalAssignments.processId, approvalProcesses.id))
      .where(
        and(
          eq(approvalAssignments.assigneeId, userId),
          eq(approvalAssignments.isPending, true),
          eq(approvalAssignments.isActive, true),
          eq(approvalProcesses.status, 'active'),
        ),
      );
    return rows[0]?.c ?? 0;
  }

  async myInitiated(userId: string) {
    return this.db.db
      .select({
        id: approvalProcesses.id,
        entity_type: approvalProcesses.entityType,
        entity_id: approvalProcesses.entityId,
        route_name: approvalRoutes.name,
        status: approvalProcesses.status,
        current_step_order: approvalProcesses.currentStepOrder,
        initiated_at: approvalProcesses.initiatedAt,
        completed_at: approvalProcesses.completedAt,
      })
      .from(approvalProcesses)
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .where(eq(approvalProcesses.initiatedBy, userId))
      .orderBy(desc(approvalProcesses.initiatedAt))
      .limit(200);
  }

  async myParticipated(userId: string) {
    const rows = await this.db.db
      .selectDistinct({
        id: approvalProcesses.id,
        entity_type: approvalProcesses.entityType,
        entity_id: approvalProcesses.entityId,
        route_name: approvalRoutes.name,
        status: approvalProcesses.status,
        initiated_at: approvalProcesses.initiatedAt,
      })
      .from(approvalProcesses)
      .innerJoin(approvalAssignments, eq(approvalAssignments.processId, approvalProcesses.id))
      .leftJoin(approvalRoutes, eq(approvalProcesses.routeId, approvalRoutes.id))
      .where(eq(approvalAssignments.assigneeId, userId))
      .orderBy(desc(approvalProcesses.initiatedAt))
      .limit(200);
    return rows;
  }

  private async getUserNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await this.db.db
      .select({
        id: users.id,
        lastName: users.lastName,
        firstName: users.firstName,
        middleName: users.middleName,
      })
      .from(users)
      .where(inArray(users.id, ids));
    return new Map(
      rows.map((u) => [
        u.id,
        [u.lastName, u.firstName, u.middleName].filter(Boolean).join(' ').trim() || u.id,
      ]),
    );
  }
}
