import type {
  GanttApiContractNode,
  GanttApiProjectNode,
  GanttApiStageNode,
  GanttApiTaskNode,
  GanttHierarchyResponse,
} from '../../../types/gantt';
import { type GanttHierarchyLink, type GanttHierarchyNode } from './ganttHierarchyTypes';
import { ensureDateRange } from './ganttDates';
import { withAutoAuxiliaryProjectCode } from './ganttAuxiliary';
import { mapHierarchyForestToGantt } from './mapHierarchyToGantt';

function hours(node: {
  planned_hours?: number | null;
  labor_hours?: number | null;
  actual_hours?: number | null;
  plan_amount?: number | null;
  fact_amount?: number | null;
  hourly_rate?: number | null;
}) {
  return {
    laborHours: node.planned_hours ?? node.labor_hours ?? null,
    actualHours: node.actual_hours ?? null,
    planAmount: node.plan_amount ?? null,
    factAmount: node.fact_amount ?? null,
    hourlyRate: node.hourly_rate ?? null,
  };
}

function mapTask(
  node: GanttApiTaskNode,
  parentRange: { start: string; end: string },
  stageDeadline?: string | null,
  stageId?: string,
): GanttHierarchyNode {
  const range = ensureDateRange(node.start, node.end, parentRange.start, parentRange.end);
  return {
    id: node.id,
    kind: 'task',
    name: node.name,
    start: range.start,
    end: range.end,
    deadline: node.deadline ?? stageDeadline ?? range.end,
    taskClass: node.task_class ?? 'technical',
    isAutoAuxiliary: Boolean(node.is_auto_auxiliary),
    ganttStageId: stageId,
    ...hours(node),
    budget: null,
    progress: node.progress ?? 0,
    status: node.status,
    responsibleUserId: node.responsible_user_id,
    assigneeIds: node.assignee_ids ?? [],
    children: (node.children ?? [])
      .filter(child => !child.is_auto_auxiliary)
      .map(child => mapTask(child, range, stageDeadline, stageId)),
  };
}

function mapStageTasks(
  node: GanttApiStageNode,
  parentRange: { start: string; end: string },
): { stage: GanttHierarchyNode; auxiliaryTasks: GanttHierarchyNode[] } {
  const range = ensureDateRange(node.start, node.end, parentRange.start, parentRange.end);
  const stageDeadline = node.deadline ?? range.end;
  const boundStart = node.bound_start ?? range.start;
  const auxiliaryTasks: GanttHierarchyNode[] = [];
  const taskChildren: GanttHierarchyNode[] = [];

  for (const child of node.children ?? []) {
    if (child.is_auto_auxiliary) {
      auxiliaryTasks.push(mapTask(child, range, stageDeadline, node.id));
      continue;
    }
    taskChildren.push(mapTask(child, range, stageDeadline, node.id));
  }

  return {
    stage: {
      id: node.id,
      kind: 'stage',
      name: node.name,
      stageNumber: node.stage_number,
      start: range.start,
      end: range.end,
      deadline: stageDeadline,
      boundStart,
      ...hours(node),
      budget: node.budget ?? null,
      children: taskChildren,
    },
    auxiliaryTasks,
  };
}

function mapContract(
  node: GanttApiContractNode,
  parentRange: { start: string; end: string },
): { contract: GanttHierarchyNode; auxiliaryTasks: GanttHierarchyNode[] } {
  const range = ensureDateRange(node.start, node.end, parentRange.start, parentRange.end);
  const auxiliaryTasks: GanttHierarchyNode[] = [];
  const stageChildren: GanttHierarchyNode[] = [];

  for (const stage of node.children ?? []) {
    const mapped = mapStageTasks(stage, range);
    stageChildren.push(mapped.stage);
    auxiliaryTasks.push(...mapped.auxiliaryTasks);
  }

  return {
    contract: {
      id: node.id,
      kind: 'contract',
      name: node.name,
      contractNumber: node.contract_number ?? undefined,
      contractDateSigned: node.contract_date_signed ?? undefined,
      start: range.start,
      end: range.end,
      deadline: node.deadline ?? range.end,
      ...hours(node),
      budget: node.budget ?? null,
      children: stageChildren,
    },
    auxiliaryTasks,
  };
}

function mapProject(node: GanttApiProjectNode): GanttHierarchyNode {
  const range = ensureDateRange(node.start, node.end);
  const auxiliaryTasks: GanttHierarchyNode[] = [];
  const contractChildren: GanttHierarchyNode[] = [];

  for (const contract of node.children ?? []) {
    const mapped = mapContract(contract, range);
    contractChildren.push(mapped.contract);
    auxiliaryTasks.push(...mapped.auxiliaryTasks);
  }

  // Одна вспомогательная на проект — показываем на уровне проекта, не внутри этапа.
  const projectAuxiliary = auxiliaryTasks.slice(0, 1).map(task => ({
    ...task,
    name: withAutoAuxiliaryProjectCode(task.name, node.project_code, Boolean(task.isAutoAuxiliary)),
  }));

  return {
    id: node.id,
    kind: 'project',
    name: node.name,
    projectCode: node.project_code ?? undefined,
    start: range.start,
    end: range.end,
    deadline: node.deadline ?? range.end,
    ...hours(node),
    budget: node.budget ?? null,
    children: [...projectAuxiliary, ...contractChildren],
  };
}

/** API hierarchy → flat SVAR tasks/links. */
export function mapApiHierarchyToGantt(response: GanttHierarchyResponse) {
  const roots = (response.projects ?? []).map(mapProject);
  const links: GanttHierarchyLink[] = (response.links ?? []).map(link => ({
    id: link.id,
    source: link.source,
    target: link.target,
    type: (link.type as GanttHierarchyLink['type']) || 'e2s',
  }));
  return mapHierarchyForestToGantt(roots, links);
}
