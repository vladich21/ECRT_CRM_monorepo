import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service';
import {
  and,
  asc,
  buildTaskTree,
  collectContractProjectWarnings,
  contractStages,
  contracts,
  eq,
  ganttLinks,
  ganttTaskAssignees,
  ganttTasks,
  ganttTaskTimeEntries,
  groupBy,
  inArray,
  isMissingRelationError,
  or,
  projects,
  sum,
  toDateStr,
  toNum,
  type DateWarning,
} from './gantt.helpers';

@Injectable()
export class GanttService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Полное дерево для диаграммы: Project → Contract → Stage → Tasks.
   */
  async getHierarchy() {
    const projectRows = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.isDeleted, false))
      .orderBy(asc(projects.code), asc(projects.name));

    if (projectRows.length === 0) {
      return { projects: [], links: [], date_warnings: [] as DateWarning[] };
    }

    const projectIds = projectRows.map(p => p.id);

    const contractRows = await this.db.db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.isDeleted, false),
          eq(contracts.isActive, true),
          eq(contracts.planInGantt, true),
          inArray(contracts.projectId, projectIds),
        ),
      )
      .orderBy(asc(contracts.number), asc(contracts.name));

    const contractIds = contractRows.map(c => c.id);
    const stageRows =
      contractIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(contractStages)
            .where(
              and(
                eq(contractStages.isArchived, false),
                inArray(contractStages.contractId, contractIds),
              ),
            )
            .orderBy(asc(contractStages.stageNumber), asc(contractStages.name));

    const stageIds = stageRows.map(s => s.id);

    // Таблицы gantt_* могут ещё не быть накатаны — дерево Project→Contract→Stage всё равно отдаём.
    let taskRows: Array<typeof ganttTasks.$inferSelect> = [];
    let assigneeRows: Array<typeof ganttTaskAssignees.$inferSelect> = [];
    let hoursRows: Array<{ taskId: string; total: string | null }> = [];
    let linkRows: Array<typeof ganttLinks.$inferSelect> = [];

    try {
      taskRows =
        stageIds.length === 0
          ? []
          : await this.db.db
              .select()
              .from(ganttTasks)
              .where(and(eq(ganttTasks.isDeleted, false), inArray(ganttTasks.stageId, stageIds)))
              .orderBy(asc(ganttTasks.sortOrder), asc(ganttTasks.name));

      const taskIds = taskRows.map(t => t.id);
      assigneeRows =
        taskIds.length === 0
          ? []
          : await this.db.db
              .select()
              .from(ganttTaskAssignees)
              .where(inArray(ganttTaskAssignees.taskId, taskIds));

      hoursRows =
        taskIds.length === 0
          ? []
          : await this.db.db
              .select({
                taskId: ganttTaskTimeEntries.taskId,
                total: sum(ganttTaskTimeEntries.hours),
              })
              .from(ganttTaskTimeEntries)
              .where(inArray(ganttTaskTimeEntries.taskId, taskIds))
              .groupBy(ganttTaskTimeEntries.taskId);

      linkRows =
        taskIds.length === 0
          ? []
          : await this.db.db
              .select()
              .from(ganttLinks)
              .where(
                or(
                  inArray(ganttLinks.sourceTaskId, taskIds),
                  inArray(ganttLinks.targetTaskId, taskIds),
                ),
              );
    } catch (error) {
      if (!isMissingRelationError(error)) throw error;
      // eslint-disable-next-line no-console
      console.warn(
        '[gantt] tables missing — run apps/backend-nest/docs/gantt-tasks.sql. Returning hierarchy without tasks.',
      );
      taskRows = [];
      assigneeRows = [];
      hoursRows = [];
      linkRows = [];
    }

    const assigneesByTask = groupBy(assigneeRows, row => row.taskId);
    const assigneesMap = new Map(
      [...assigneesByTask.entries()].map(([taskId, rows]) => [
        taskId,
        rows.map(r => r.userId),
      ]),
    );
    const actualByTask = new Map(hoursRows.map(row => [row.taskId, toNum(row.total)]));
    const tasksByStage = groupBy(taskRows, t => t.stageId);
    const stagesByContract = groupBy(stageRows, s => s.contractId);
    const contractsByProject = groupBy(contractRows, c => c.projectId);

    const dateWarnings: DateWarning[] = [];

    const hierarchyProjects = projectRows.map(project => {
      const projectContracts = (contractsByProject.get(project.id) ?? []).map(contract => {
        dateWarnings.push(...collectContractProjectWarnings(project, contract));

        const cStart = toDateStr(contract.startDate);
        const cEnd = toDateStr(contract.endDate);
        const stageNodes = (stagesByContract.get(contract.id) ?? []).map(stage => {
          const stageStart =
            toDateStr(stage.plannedStartDate) ?? toDateStr(stage.actualStartDate) ?? cStart;
          const stageEnd =
            toDateStr(stage.plannedEndDate) ?? toDateStr(stage.actualEndDate) ?? cEnd;
          const taskChildren = buildTaskTree(
            stage.id,
            null,
            tasksByStage,
            actualByTask,
            assigneesMap,
          );
          const plannedHours = taskChildren.reduce((s, t) => s + t.planned_hours, 0);
          const actualHours = taskChildren.reduce((s, t) => s + t.actual_hours, 0);
          // В Гант — только собственные затраты + прибыль (B), не соисполнители.
          const ownBudget = toNum(stage.ownBudget);
          const coexecutorBudget = toNum(stage.coexecutorBudget);
          const ganttBudget =
            ownBudget > 0 || coexecutorBudget > 0
              ? ownBudget
              : toNum(stage.plannedBudget);

          return {
            id: stage.id,
            kind: 'stage' as const,
            name: stage.name,
            stage_number: stage.stageNumber,
            start: stageStart,
            end: stageEnd,
            deadline: stageEnd,
            budget: ganttBudget,
            planned_hours: plannedHours,
            actual_hours: actualHours,
            labor_hours: plannedHours,
            children: taskChildren,
          };
        });

        const plannedHours = stageNodes.reduce((s, st) => s + st.planned_hours, 0);
        const actualHours = stageNodes.reduce((s, st) => s + st.actual_hours, 0);
        // Бюджет договора в Ганте = сумма B по этапам (без fallback на сумму договора).
        const contractBudget = stageNodes.reduce((s, st) => s + st.budget, 0);

        return {
          id: contract.id,
          kind: 'contract' as const,
          name: contract.name ?? '',
          contract_number: contract.number,
          contract_date_signed: toDateStr(contract.dateSigned),
          start: cStart,
          end: cEnd,
          deadline: cEnd,
          budget: contractBudget,
          planned_hours: plannedHours,
          actual_hours: actualHours,
          labor_hours: plannedHours,
          children: stageNodes,
        };
      });

      const plannedHours = projectContracts.reduce((s, c) => s + c.planned_hours, 0);
      const actualHours = projectContracts.reduce((s, c) => s + c.actual_hours, 0);
      const budget = projectContracts.reduce((s, c) => s + c.budget, 0);

      return {
        id: project.id,
        kind: 'project' as const,
        name: project.name ?? '',
        project_code: project.code,
        start: toDateStr(project.startDate),
        end: toDateStr(project.endDate),
        deadline: toDateStr(project.endDate),
        budget,
        planned_hours: plannedHours,
        actual_hours: actualHours,
        labor_hours: plannedHours,
        children: projectContracts,
      };
    });

    return {
      projects: hierarchyProjects,
      links: linkRows.map(link => ({
        id: link.id,
        source: link.sourceTaskId,
        target: link.targetTaskId,
        type: link.linkType,
      })),
      date_warnings: dateWarnings,
    };
  }

  async listTasks(filters: {
    userId?: string;
    stageId?: string;
    from?: string;
    to?: string;
    status?: string;
  }) {
    const conditions = [eq(ganttTasks.isDeleted, false)];
    if (filters.stageId) conditions.push(eq(ganttTasks.stageId, filters.stageId));
    if (filters.status) conditions.push(eq(ganttTasks.status, filters.status));

    let rows = await this.db.db
      .select()
      .from(ganttTasks)
      .where(and(...conditions))
      .orderBy(asc(ganttTasks.sortOrder), asc(ganttTasks.name));

    if (filters.userId) {
      const assigned = await this.db.db
        .select({ taskId: ganttTaskAssignees.taskId })
        .from(ganttTaskAssignees)
        .where(eq(ganttTaskAssignees.userId, filters.userId));
      const assignedIds = new Set(assigned.map(a => a.taskId));
      rows = rows.filter(
        t => t.responsibleUserId === filters.userId || assignedIds.has(t.id),
      );
    }

    if (filters.from || filters.to) {
      rows = rows.filter(t => {
        const start = toDateStr(t.startDate);
        const end = toDateStr(t.endDate);
        if (filters.from && end && end < filters.from) return false;
        if (filters.to && start && start > filters.to) return false;
        return true;
      });
    }

    const taskIds = rows.map(r => r.id);
    const assignees =
      taskIds.length === 0
        ? []
        : await this.db.db
            .select()
            .from(ganttTaskAssignees)
            .where(inArray(ganttTaskAssignees.taskId, taskIds));
    const hours =
      taskIds.length === 0
        ? []
        : await this.db.db
            .select({
              taskId: ganttTaskTimeEntries.taskId,
              total: sum(ganttTaskTimeEntries.hours),
            })
            .from(ganttTaskTimeEntries)
            .where(inArray(ganttTaskTimeEntries.taskId, taskIds))
            .groupBy(ganttTaskTimeEntries.taskId);

    const assigneesByTask = new Map<string, string[]>();
    for (const row of assignees) {
      const list = assigneesByTask.get(row.taskId) ?? [];
      list.push(row.userId);
      assigneesByTask.set(row.taskId, list);
    }
    const actualByTask = new Map(hours.map(h => [h.taskId, toNum(h.total)]));

    const stageIds = [...new Set(rows.map(r => r.stageId))];
    const stageMeta =
      stageIds.length === 0
        ? []
        : await this.db.db
            .select({
              stageId: contractStages.id,
              stageName: contractStages.name,
              contractId: contractStages.contractId,
              contractName: contracts.name,
              projectId: contracts.projectId,
              projectName: projects.name,
            })
            .from(contractStages)
            .leftJoin(contracts, eq(contractStages.contractId, contracts.id))
            .leftJoin(projects, eq(contracts.projectId, projects.id))
            .where(inArray(contractStages.id, stageIds));

    const metaByStage = new Map(
      stageMeta.map(m => [
        m.stageId,
        {
          stageName: m.stageName,
          contractId: m.contractId,
          contractName: m.contractName,
          projectId: m.projectId,
          projectName: m.projectName,
        },
      ]),
    );

    return {
      data: rows.map(task => {
        const meta = metaByStage.get(task.stageId);
        return {
          id: task.id,
          name: task.name,
          stage_id: task.stageId,
          parent_id: task.parentId,
          start_date: toDateStr(task.startDate),
          end_date: toDateStr(task.endDate),
          deadline: toDateStr(task.deadline),
          progress: task.progress,
          status: task.status,
          planned_hours: toNum(task.plannedHours),
          actual_hours: actualByTask.get(task.id) ?? 0,
          responsible_user_id: task.responsibleUserId,
          assignee_ids: assigneesByTask.get(task.id) ?? [],
          stage_name: meta?.stageName ?? null,
          contract_id: meta?.contractId ?? null,
          contract_name: meta?.contractName ?? null,
          project_id: meta?.projectId ?? null,
          project_name: meta?.projectName ?? null,
          updated_at: task.updatedAt,
        };
      }),
    };
  }

  async getTask(id: string) {
    const { data } = await this.listTasks({});
    const task = data.find(t => t.id === id);
    if (!task) throw new NotFoundException('Задача не найдена');
    return task;
  }

  async createTask(body: Record<string, unknown>, userId?: string) {
    const stageId = typeof body.stage_id === 'string' ? body.stage_id : null;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!stageId) throw new BadRequestException('stage_id обязателен');
    if (!name) throw new BadRequestException('name обязателен');

    await this.assertStageExists(stageId);
    const parentId = typeof body.parent_id === 'string' ? body.parent_id : null;
    if (parentId) await this.assertTaskInStage(parentId, stageId);

    const startDate = toDateStr(body.start_date) ?? toDateStr(body.start);
    const endDate = toDateStr(body.end_date) ?? toDateStr(body.end);
    await this.assertDatesWithinStage(stageId, startDate, endDate);

    const [created] = await this.db.db
      .insert(ganttTasks)
      .values({
        stageId,
        parentId,
        name,
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
        deadline: toDateStr(body.deadline) ?? endDate ?? undefined,
        progress: typeof body.progress === 'number' ? body.progress : 0,
        status: typeof body.status === 'string' ? body.status : 'open',
        plannedHours: String(toNum(body.planned_hours ?? body.labor_hours)),
        responsibleUserId:
          typeof body.responsible_user_id === 'string' ? body.responsible_user_id : null,
        sortOrder: typeof body.sort_order === 'number' ? body.sort_order : 0,
        createdBy: userId ?? null,
        updatedAt: new Date(),
      })
      .returning();

    const assigneeIds = Array.isArray(body.assignee_ids)
      ? body.assignee_ids.filter((id): id is string => typeof id === 'string')
      : [];
    if (assigneeIds.length > 0) {
      await this.syncAssignees(created.id, assigneeIds);
    }

    return this.getTask(created.id);
  }

  async updateTask(id: string, body: Record<string, unknown>, userId?: string) {
    const existing = await this.requireTask(id);

    const startDate =
      'start_date' in body || 'start' in body
        ? toDateStr(body.start_date ?? body.start)
        : toDateStr(existing.startDate);
    const endDate =
      'end_date' in body || 'end' in body
        ? toDateStr(body.end_date ?? body.end)
        : toDateStr(existing.endDate);

    if ('start_date' in body || 'start' in body || 'end_date' in body || 'end' in body) {
      await this.assertDatesWithinStage(existing.stageId, startDate, endDate);
    }

    const patch: Partial<typeof ganttTasks.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: userId ?? null,
    };
    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim();
    if ('parent_id' in body) {
      patch.parentId = typeof body.parent_id === 'string' ? body.parent_id : null;
      if (patch.parentId) await this.assertTaskInStage(patch.parentId, existing.stageId);
    }
    // Не пишем null поверх существующих дат, если клиент прислал пустое значение по ошибке.
    if (('start_date' in body || 'start' in body) && startDate) patch.startDate = startDate;
    if (('end_date' in body || 'end' in body) && endDate) patch.endDate = endDate;
    if ('deadline' in body) {
      const deadline = toDateStr(body.deadline);
      if (deadline || body.deadline === null) patch.deadline = deadline;
    }
    if (typeof body.progress === 'number') patch.progress = body.progress;
    if (typeof body.status === 'string' && body.status.trim()) patch.status = body.status;
    if ('planned_hours' in body || 'labor_hours' in body) {
      patch.plannedHours = String(toNum(body.planned_hours ?? body.labor_hours));
    }
    if ('responsible_user_id' in body) {
      patch.responsibleUserId =
        typeof body.responsible_user_id === 'string' ? body.responsible_user_id : null;
    }
    if (typeof body.sort_order === 'number') patch.sortOrder = body.sort_order;

    await this.db.db.update(ganttTasks).set(patch).where(eq(ganttTasks.id, id));

    if (Array.isArray(body.assignee_ids)) {
      const assigneeIds = body.assignee_ids.filter((x): x is string => typeof x === 'string');
      await this.syncAssignees(id, assigneeIds);
    }

    return this.getTask(id);
  }

  async deleteTask(id: string) {
    await this.requireTask(id);
    await this.db.db
      .update(ganttTasks)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(ganttTasks.id, id));
    return { ok: true };
  }

  async createTimeEntry(taskId: string, body: Record<string, unknown>) {
    await this.requireTask(taskId);
    const userId = typeof body.user_id === 'string' ? body.user_id : null;
    const workDate = toDateStr(body.work_date ?? body.date);
    const hours = toNum(body.hours);
    if (!userId) throw new BadRequestException('user_id обязателен');
    if (!workDate) throw new BadRequestException('work_date обязателен');
    if (hours <= 0) throw new BadRequestException('hours должен быть > 0');

    const externalId = typeof body.external_id === 'string' ? body.external_id : null;
    if (externalId) {
      const [existing] = await this.db.db
        .select()
        .from(ganttTaskTimeEntries)
        .where(eq(ganttTaskTimeEntries.externalId, externalId))
        .limit(1);
      if (existing) {
        const [updated] = await this.db.db
          .update(ganttTaskTimeEntries)
          .set({
            taskId,
            userId,
            workDate,
            hours: String(hours),
            comment: typeof body.comment === 'string' ? body.comment : existing.comment,
            updatedAt: new Date(),
          })
          .where(eq(ganttTaskTimeEntries.id, existing.id))
          .returning();
        return this.toTimeEntryResponse(updated);
      }
    }

    const [created] = await this.db.db
      .insert(ganttTaskTimeEntries)
      .values({
        taskId,
        userId,
        workDate,
        hours: String(hours),
        comment: typeof body.comment === 'string' ? body.comment : null,
        externalId,
        updatedAt: new Date(),
      })
      .returning();

    return this.toTimeEntryResponse(created);
  }

  async updateTimeEntry(entryId: string, body: Record<string, unknown>) {
    const [existing] = await this.db.db
      .select()
      .from(ganttTaskTimeEntries)
      .where(eq(ganttTaskTimeEntries.id, entryId))
      .limit(1);
    if (!existing) throw new NotFoundException('Списание не найдено');

    const [updated] = await this.db.db
      .update(ganttTaskTimeEntries)
      .set({
        workDate: toDateStr(body.work_date ?? body.date) ?? existing.workDate,
        hours: 'hours' in body ? String(toNum(body.hours)) : existing.hours,
        comment:
          typeof body.comment === 'string' ? body.comment : existing.comment,
        updatedAt: new Date(),
      })
      .where(eq(ganttTaskTimeEntries.id, entryId))
      .returning();

    return this.toTimeEntryResponse(updated);
  }

  async deleteTimeEntry(entryId: string) {
    const deleted = await this.db.db
      .delete(ganttTaskTimeEntries)
      .where(eq(ganttTaskTimeEntries.id, entryId))
      .returning({ id: ganttTaskTimeEntries.id });
    if (deleted.length === 0) throw new NotFoundException('Списание не найдено');
    return { ok: true };
  }

  async createLink(body: Record<string, unknown>) {
    const source = typeof body.source === 'string' ? body.source : null;
    const target = typeof body.target === 'string' ? body.target : null;
    const linkType = typeof body.type === 'string' ? body.type : 'e2s';
    if (!source || !target) throw new BadRequestException('source и target обязательны');
    await this.requireTask(source);
    await this.requireTask(target);

    const [created] = await this.db.db
      .insert(ganttLinks)
      .values({
        sourceTaskId: source,
        targetTaskId: target,
        linkType,
      })
      .returning();

    return {
      id: created.id,
      source: created.sourceTaskId,
      target: created.targetTaskId,
      type: created.linkType,
    };
  }

  async deleteLink(id: string) {
    const deleted = await this.db.db
      .delete(ganttLinks)
      .where(eq(ganttLinks.id, id))
      .returning({ id: ganttLinks.id });
    if (deleted.length === 0) throw new NotFoundException('Связь не найдена');
    return { ok: true };
  }

  private toTimeEntryResponse(row: typeof ganttTaskTimeEntries.$inferSelect) {
    return {
      id: row.id,
      task_id: row.taskId,
      user_id: row.userId,
      work_date: toDateStr(row.workDate),
      hours: toNum(row.hours),
      comment: row.comment,
      external_id: row.externalId,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }

  private async requireTask(id: string) {
    const [task] = await this.db.db
      .select()
      .from(ganttTasks)
      .where(and(eq(ganttTasks.id, id), eq(ganttTasks.isDeleted, false)))
      .limit(1);
    if (!task) throw new NotFoundException('Задача не найдена');
    return task;
  }

  private async assertStageExists(stageId: string) {
    const [stage] = await this.db.db
      .select({ id: contractStages.id })
      .from(contractStages)
      .where(eq(contractStages.id, stageId))
      .limit(1);
    if (!stage) throw new BadRequestException('Этап не найден');
  }

  private async assertTaskInStage(taskId: string, stageId: string) {
    const task = await this.requireTask(taskId);
    if (task.stageId !== stageId) {
      throw new BadRequestException('Родительская задача принадлежит другому этапу');
    }
  }

  private async assertDatesWithinStage(
    stageId: string,
    start: string | null,
    end: string | null,
  ) {
    const [stage] = await this.db.db
      .select()
      .from(contractStages)
      .where(eq(contractStages.id, stageId))
      .limit(1);
    if (!stage) throw new BadRequestException('Этап не найден');

    const stageStart =
      toDateStr(stage.plannedStartDate) ?? toDateStr(stage.actualStartDate);
    const stageEnd =
      toDateStr(stage.plannedEndDate) ?? toDateStr(stage.actualEndDate);

    if (start && stageStart && start < stageStart) {
      throw new BadRequestException(
        `Начало задачи (${start}) раньше срока этапа (${stageStart})`,
      );
    }
    if (end && stageEnd && end > stageEnd) {
      throw new BadRequestException(
        `Окончание задачи (${end}) позже срока этапа (${stageEnd})`,
      );
    }
    if (start && end && start > end) {
      throw new BadRequestException('Начало задачи позже окончания');
    }
  }

  private async syncAssignees(taskId: string, userIds: string[]) {
    await this.db.db.delete(ganttTaskAssignees).where(eq(ganttTaskAssignees.taskId, taskId));
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return;
    await this.db.db.insert(ganttTaskAssignees).values(
      unique.map(userId => ({ taskId, userId })),
    );
  }
}
