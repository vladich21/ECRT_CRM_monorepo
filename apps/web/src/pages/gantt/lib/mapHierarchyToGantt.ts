import type { ILink, ITask } from '@svar-ui/react-gantt';

import { GANTT_DOMAIN_TASK_TYPE } from '../ganttTaskTypes';
import { durationDaysFromIso, formatDateRu, parseIsoDate } from './ganttDates';
import {
  type GanttEntityKind,
  type GanttHierarchyLink,
  type GanttHierarchyNode,
} from './ganttHierarchyTypes';

function formatProjectLabel(node: GanttHierarchyNode): string {
  const code = node.projectCode?.trim();
  let name = node.name.trim();
  if (code && name) {
    const prefix = `${code} - `;
    if (name.startsWith(prefix)) {
      name = name.slice(prefix.length).trim();
    }
    if (name === code) {
      name = '';
    }
  }
  return name || '-';
}

function formatContractLabel(node: GanttHierarchyNode): string {
  const number = node.contractNumber?.trim() || '—';
  const date = node.contractDateSigned ? formatDateRu(node.contractDateSigned) : null;
  const name = node.name.trim();
  let label = `Договор №${number}`;
  if (date) label += ` от ${date}`;
  if (name) label += ` "${name}"`;
  return label;
}

function formatStageLabel(node: GanttHierarchyNode): string {
  const number = node.stageNumber;
  const name = node.name.trim();
  if (number != null && name) return `Этап ${number} — ${name}`;
  if (number != null) return `Этап ${number}`;
  return name || '-';
}

function formatNodeTitle(node: GanttHierarchyNode): string {
  switch (node.kind) {
    case 'project':
      return formatProjectLabel(node);
    case 'contract':
      return formatContractLabel(node);
    case 'stage':
      return formatStageLabel(node);
    case 'workPackage':
    case 'task':
      return node.name.trim() || '-';
    default:
      return node.name;
  }
}

function toSvarType(kind: GanttEntityKind): ITask['type'] {
  if (kind === 'task') return 'task';
  return GANTT_DOMAIN_TASK_TYPE;
}

/**
 * Сплющивание одного или нескольких корней в flat `tasks[]` с `parent`.
 * По умолчанию ветки закрыты (`open: false`).
 */
export function mapHierarchyForestToGantt(
  roots: GanttHierarchyNode[],
  links: GanttHierarchyLink[] = [],
): { tasks: ITask[]; links: ILink[] } {
  const tasks: ITask[] = [];
  const orderCounter = { value: 0 };

  const walk = (node: GanttHierarchyNode, parentId: number | string) => {
    const children = node.children ?? [];
    const title = formatNodeTitle(node);
    const start = parseIsoDate(node.start);
    const end = parseIsoDate(node.end);
    if (!start || !end) return;

    tasks.push({
      id: node.id,
      text: title,
      start,
      end,
      duration: durationDaysFromIso(node.start, node.end),
      progress: node.progress ?? 0,
      type: toSvarType(node.kind),
      parent: parentId,
      ...(children.length > 0 ? { open: false as const } : {}),
      entityKind: node.kind,
      entityName: title,
      ...(node.kind === 'project' && node.projectCode
        ? { projectCode: node.projectCode }
        : {}),
      deadline: parseIsoDate(node.deadline) ?? end,
      ...(node.boundStart
        ? { boundStart: parseIsoDate(node.boundStart) }
        : {}),
      ...(node.kind !== 'task'
        ? {
            timelineStart: start,
            timelineEnd: end,
            css: 'gantt-domain-bar',
          }
        : {}),
      laborHours: node.laborHours ?? null,
      actualHours: node.actualHours ?? null,
      budget: node.budget ?? null,
      planAmount: node.planAmount ?? null,
      factAmount: node.factAmount ?? null,
      hourlyRate: node.hourlyRate ?? null,
      ...(node.kind === 'task'
        ? {
            taskClass: node.taskClass ?? 'technical',
            isAutoAuxiliary: Boolean(node.isAutoAuxiliary),
            ...(node.ganttStageId ? { ganttStageId: node.ganttStageId } : {}),
          }
        : {}),
      responsibleUserId: node.responsibleUserId ?? null,
      assigneeIds: node.assigneeIds ?? [],
      status: node.status,
      originalSortIndex: orderCounter.value,
    });
    orderCounter.value += 1;

    for (const child of children) {
      walk(child, node.id);
    }
  };

  for (const root of roots) {
    walk(root, 0);
  }

  return {
    tasks,
    links: links.map(link => ({
      id: link.id,
      source: link.source,
      target: link.target,
      type: link.type,
    })),
  };
}

