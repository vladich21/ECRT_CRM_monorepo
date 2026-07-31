import type {
  GanttApiContractNode,
  GanttApiProjectNode,
  GanttApiStageNode,
  GanttApiTaskNode,
  GanttHierarchyResponse,
} from '../../../types/gantt';
import {
  type GanttHierarchyNode,
  type GanttMockLink,
} from '../mock/ganttHierarchyMock';
import { ensureDateRange } from './ganttDates';
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
  /** «Срок» этапа — для задач без своего deadline. */
  stageDeadline?: string | null,
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
    ...hours(node),
    budget: null,
    progress: node.progress ?? 0,
    status: node.status,
    responsibleUserId: node.responsible_user_id,
    assigneeIds: node.assignee_ids ?? [],
    children: (node.children ?? []).map(child => mapTask(child, range, stageDeadline)),
  };
}

function mapStage(
  node: GanttApiStageNode,
  parentRange: { start: string; end: string },
): GanttHierarchyNode {
  // start/end этапа на шкале = rollup подзадач; deadline = контрактный срок из карточки.
  const range = ensureDateRange(node.start, node.end, parentRange.start, parentRange.end);
  const stageDeadline = node.deadline ?? range.end;
  const boundStart = node.bound_start ?? range.start;
  return {
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
    children: (node.children ?? []).map(child => mapTask(child, range, stageDeadline)),
  };
}

function mapContract(
  node: GanttApiContractNode,
  parentRange: { start: string; end: string },
): GanttHierarchyNode {
  const range = ensureDateRange(node.start, node.end, parentRange.start, parentRange.end);
  return {
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
    children: (node.children ?? []).map(child => mapStage(child, range)),
  };
}

function mapProject(node: GanttApiProjectNode): GanttHierarchyNode {
  const range = ensureDateRange(node.start, node.end);
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
    children: (node.children ?? []).map(child => mapContract(child, range)),
  };
}

/** API hierarchy → flat SVAR tasks/links. */
export function mapApiHierarchyToGantt(response: GanttHierarchyResponse) {
  const roots = (response.projects ?? []).map(mapProject);
  const links: GanttMockLink[] = (response.links ?? []).map(link => ({
    id: link.id,
    source: link.source,
    target: link.target,
    type: (link.type as GanttMockLink['type']) || 'e2s',
  }));
  return mapHierarchyForestToGantt(roots, links);
}
