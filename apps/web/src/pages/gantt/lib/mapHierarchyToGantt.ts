import type { ILink, ITask } from '@svar-ui/react-gantt';

import {
  durationDays,
  type GanttEntityKind,
  type GanttHierarchyNode,
  type GanttMockLink,
  type GanttMockProjectBundle,
} from '../mock/ganttHierarchyMock';

function formatDateRu(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU');
}

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
      return node.name.trim();
    case 'task':
      return node.name.trim();
    default:
      return node.name;
  }
}

/** summary = ветка дерева, task = лист */
function toSvarType(kind: GanttEntityKind): ITask['type'] {
  return kind === 'task' ? 'task' : 'summary';
}

function parseDate(iso: string | undefined): Date | undefined {
  if (!iso) return undefined;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Сплющивание дерева в flat `tasks[]` с `parent`.
 * По умолчанию ветки закрыты (`open: false`) — раскрывает пользователь.
 */
function mapNodeToTasks(
  node: GanttHierarchyNode,
  parentId: number | string,
  out: ITask[],
  orderCounter: { value: number },
): void {
  const children = node.children ?? [];
  const title = formatNodeTitle(node);
  const start = parseDate(node.start)!;
  const end = parseDate(node.end)!;
  const originalSortIndex = orderCounter.value;
  orderCounter.value += 1;

  out.push({
    id: node.id,
    text: title,
    start,
    end,
    duration: durationDays(node.start, node.end),
    progress: node.progress ?? 0,
    type: toSvarType(node.kind),
    parent: parentId,
    ...(children.length > 0 ? { open: false as const } : {}),
    entityKind: node.kind,
    entityName: title,
    deadline: parseDate(node.deadline) ?? end,
    laborHours: node.laborHours ?? null,
    actualHours: node.actualHours ?? null,
    originalSortIndex,
  });

  for (const child of children) {
    mapNodeToTasks(child, node.id, out, orderCounter);
  }
}

export function mapHierarchyToGanttTasks(tree: GanttHierarchyNode): ITask[] {
  const tasks: ITask[] = [];
  mapNodeToTasks(tree, 0, tasks, { value: 0 });
  return tasks;
}

export function mapMockLinks(links: GanttMockLink[]): ILink[] {
  return links.map(link => ({
    id: link.id,
    source: link.source,
    target: link.target,
    type: link.type,
  }));
}

export function mapMockBundleToGantt(bundle: GanttMockProjectBundle): {
  tasks: ITask[];
  links: ILink[];
} {
  return {
    tasks: mapHierarchyToGanttTasks(bundle.tree),
    links: mapMockLinks(bundle.links),
  };
}

/** Все мок-проекты в одной плоской таблице Gantt (несколько корней с parent: 0). */
export function mapAllMockProjectsToGantt(bundles: GanttMockProjectBundle[]): {
  tasks: ITask[];
  links: ILink[];
} {
  const tasks: ITask[] = [];
  const links: ILink[] = [];
  const orderCounter = { value: 0 };

  for (const bundle of bundles) {
    mapNodeToTasks(bundle.tree, 0, tasks, orderCounter);
    links.push(...mapMockLinks(bundle.links));
  }

  return { tasks, links };
}
