import type { ILink, ITask } from '@svar-ui/react-gantt';

import { durationDaysFromIso, formatDateRu, parseIsoDate } from './ganttDates';
import {
  type GanttEntityKind,
  type GanttHierarchyNode,
  type GanttMockLink,
  type GanttMockProjectBundle,
} from '../mock/ganttHierarchyMock';

function formatProjectLabel(node: GanttHierarchyNode): string {
  const code = node.projectCode?.trim();
  const name = node.name.trim();
  if (code && name) return `${code} - ${name}`;
  return name || code || '-';
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
  return kind === 'task' ? 'task' : 'summary';
}

/**
 * Сплющивание одного или нескольких корней в flat `tasks[]` с `parent`.
 * По умолчанию ветки закрыты (`open: false`).
 */
export function mapHierarchyForestToGantt(
  roots: GanttHierarchyNode[],
  links: GanttMockLink[] = [],
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
      deadline: parseIsoDate(node.deadline) ?? end,
      ...(node.boundStart
        ? { boundStart: parseIsoDate(node.boundStart) }
        : {}),
      laborHours: node.laborHours ?? null,
      actualHours: node.actualHours ?? null,
      budget: node.budget ?? null,
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

export function mapAllMockProjectsToGantt(bundles: GanttMockProjectBundle[]): {
  tasks: ITask[];
  links: ILink[];
} {
  return mapHierarchyForestToGantt(
    bundles.map(b => b.tree),
    bundles.flatMap(b => b.links),
  );
}
