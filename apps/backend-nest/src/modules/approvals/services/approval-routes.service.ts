import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import {
  approvalProcesses,
  approvalRouteSteps,
  approvalRoutes,
  refApprovalEntityTypes,
  refApprovalStepRoles,
  relApprovalStepAssignees,
} from '../../../database/schema';
import type { CreateRouteDto, ReplaceStepsDto, RouteStepDto, UpdateRouteDto } from '../dto/route.dto';
import type { PostApprovalAction } from '../types/approval.types';

@Injectable()
export class ApprovalRoutesService {
  constructor(private readonly db: DatabaseService) {}

  async listReferencesEntityTypes() {
    return this.db.db
      .select()
      .from(refApprovalEntityTypes)
      .where(eq(refApprovalEntityTypes.isActive, true))
      .orderBy(asc(refApprovalEntityTypes.name));
  }

  async listReferencesStepRoles() {
    return this.db.db
      .select()
      .from(refApprovalStepRoles)
      .where(eq(refApprovalStepRoles.isActive, true));
  }

  async list(entityTypeCode?: string) {
    const rows = await this.db.db
      .select({
        id: approvalRoutes.id,
        code: approvalRoutes.code,
        name: approvalRoutes.name,
        description: approvalRoutes.description,
        entityTypeId: approvalRoutes.entityTypeId,
        entityTypeCode: refApprovalEntityTypes.code,
        isDefault: approvalRoutes.isDefault,
        isActive: approvalRoutes.isActive,
        stepCount: sql<number>`(SELECT count(*)::int FROM approval_route_steps s WHERE s.route_id = ${approvalRoutes.id})`,
      })
      .from(approvalRoutes)
      .leftJoin(refApprovalEntityTypes, eq(approvalRoutes.entityTypeId, refApprovalEntityTypes.id))
      .where(entityTypeCode ? eq(refApprovalEntityTypes.code, entityTypeCode) : undefined)
      .orderBy(asc(approvalRoutes.name));
    return rows;
  }

  async getById(id: string) {
    const rows = await this.db.db.select().from(approvalRoutes).where(eq(approvalRoutes.id, id)).limit(1);
    const route = rows[0];
    if (!route) throw new NotFoundException('Маршрут не найден');
    const steps = await this.getSteps(id);
    return { ...route, steps };
  }

  async getSteps(routeId: string) {
    const steps = await this.db.db
      .select()
      .from(approvalRouteSteps)
      .where(eq(approvalRouteSteps.routeId, routeId))
      .orderBy(asc(approvalRouteSteps.stepOrder));
    if (!steps.length) return [];

    const assignees = await this.db.db
      .select()
      .from(relApprovalStepAssignees)
      .where(inArray(relApprovalStepAssignees.stepId, steps.map((s) => s.id)));

    return steps.map((s) => ({
      ...s,
      assignee_ids: assignees
        .filter((a) => a.stepId === s.id)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((a) => a.employeeId),
    }));
  }

  async create(dto: CreateRouteDto, userId: string) {
    if (dto.is_default) await this.clearDefault(dto.entity_type_id);
    const inserted = await this.db.db
      .insert(approvalRoutes)
      .values({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        entityTypeId: dto.entity_type_id,
        isDefault: dto.is_default ?? false,
        isActive: dto.is_active ?? true,
        onCompleteActions: (dto.on_complete_actions ?? []) as PostApprovalAction[],
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    return inserted[0];
  }

  async update(id: string, dto: UpdateRouteDto, userId: string) {
    const existing = await this.db.db.select().from(approvalRoutes).where(eq(approvalRoutes.id, id)).limit(1);
    if (!existing.length) throw new NotFoundException('Маршрут не найден');

    const entityTypeId = dto.entity_type_id ?? existing[0].entityTypeId;
    if (dto.is_default) await this.clearDefault(entityTypeId, id);

    const updated = await this.db.db
      .update(approvalRoutes)
      .set({
        code: dto.code ?? existing[0].code,
        name: dto.name ?? existing[0].name,
        description: dto.description ?? existing[0].description,
        entityTypeId,
        isDefault: dto.is_default ?? existing[0].isDefault,
        isActive: dto.is_active ?? existing[0].isActive,
        onCompleteActions: (dto.on_complete_actions ?? existing[0].onCompleteActions) as PostApprovalAction[],
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(approvalRoutes.id, id))
      .returning();
    return updated[0];
  }

  async remove(id: string) {
    const active = await this.db.db
      .select({ id: approvalProcesses.id })
      .from(approvalProcesses)
      .where(and(eq(approvalProcesses.routeId, id), inArray(approvalProcesses.status, ['active', 'revision'])))
      .limit(1);
    if (active.length) {
      throw new ConflictException('Нельзя удалить маршрут с активными процессами согласования');
    }
    await this.db.db.delete(approvalRoutes).where(eq(approvalRoutes.id, id));
    return { success: true };
  }

  /** Полная замена набора шагов (DELETE all → INSERT new) в транзакции. */
  async replaceSteps(routeId: string, dto: ReplaceStepsDto) {
    const route = await this.db.db.select().from(approvalRoutes).where(eq(approvalRoutes.id, routeId)).limit(1);
    if (!route.length) throw new NotFoundException('Маршрут не найден');
    if (!dto.steps.length) throw new BadRequestException('Маршрут должен содержать минимум один шаг');

    return this.db.db.transaction(async (tx) => {
      await tx.delete(approvalRouteSteps).where(eq(approvalRouteSteps.routeId, routeId));

      let order = 1;
      for (const step of dto.steps) {
        this.validateStep(step);
        const stepOrder = step.step_order ?? order;
        order = stepOrder + 1;
        const inserted = await tx
          .insert(approvalRouteSteps)
          .values({
            routeId,
            stepOrder,
            name: step.name,
            description: step.description ?? null,
            stepType: step.step_type,
            assignmentType: step.assignment_type,
            stepRoleId: step.step_role_id ?? null,
            isRequired: step.is_required ?? true,
            canDelegate: step.can_delegate ?? false,
            canReturnToPrevious: step.can_return_to_previous ?? true,
            timeLimitHours: step.time_limit_hours ?? null,
          })
          .returning({ id: approvalRouteSteps.id });
        const stepId = inserted[0].id;

        if (step.assignment_type === 'employee' && step.assignee_ids?.length) {
          await tx.insert(relApprovalStepAssignees).values(
            step.assignee_ids.map((empId, idx) => ({
              stepId,
              employeeId: empId,
              position: idx,
            })),
          );
        }
      }
      return this.getSteps(routeId);
    });
  }

  /** Метаданные для модалки запуска (§3.1). */
  async getStartInfo(routeId: string) {
    const route = await this.getById(routeId);
    const stepsRequiringSelection = route.steps
      .filter((s) => s.assignmentType === 'select_on_start')
      .map((s) => ({
        step_order: s.stepOrder,
        name: s.name,
        description: s.description,
        step_type: s.stepType,
      }));

    const actions = (route.onCompleteActions ?? []) as PostApprovalAction[];
    const actionsRequiringSelection = actions
      .filter((a) => a.task_config?.assignee_type === 'select_on_start')
      .map((a) => ({
        id: a.id,
        title_template: a.task_config.title_template,
        due_days: a.task_config.due_days,
        priority: a.task_config.priority,
      }));

    return {
      route: {
        id: route.id,
        code: route.code,
        name: route.name,
        description: route.description,
        step_count: route.steps.length,
      },
      requires_selection: stepsRequiringSelection.length > 0 || actionsRequiringSelection.length > 0,
      steps_requiring_selection: stepsRequiringSelection,
      actions_requiring_selection: actionsRequiringSelection,
    };
  }

  /** Доступные маршруты для запуска по типу сущности (активные). */
  async availableRoutes(entityTypeCode: string) {
    return this.db.db
      .select({
        id: approvalRoutes.id,
        code: approvalRoutes.code,
        name: approvalRoutes.name,
        description: approvalRoutes.description,
        isDefault: approvalRoutes.isDefault,
      })
      .from(approvalRoutes)
      .innerJoin(refApprovalEntityTypes, eq(approvalRoutes.entityTypeId, refApprovalEntityTypes.id))
      .where(and(eq(refApprovalEntityTypes.code, entityTypeCode), eq(approvalRoutes.isActive, true)))
      .orderBy(asc(approvalRoutes.name));
  }

  private validateStep(step: RouteStepDto): void {
    if (step.assignment_type === 'employee' && !step.assignee_ids?.length) {
      throw new BadRequestException(`Для шага «${step.name}» нужно указать минимум одного сотрудника`);
    }
  }

  private async clearDefault(entityTypeId: string, exceptRouteId?: string) {
    const condition = exceptRouteId
      ? and(eq(approvalRoutes.entityTypeId, entityTypeId), sql`${approvalRoutes.id} <> ${exceptRouteId}`)
      : eq(approvalRoutes.entityTypeId, entityTypeId);
    await this.db.db.update(approvalRoutes).set({ isDefault: false }).where(condition);
  }
}
