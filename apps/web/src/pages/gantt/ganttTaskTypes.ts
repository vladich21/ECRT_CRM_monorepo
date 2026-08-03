/** SVAR: type=summary всегда rollup'ит даты от детей. Доменные узлы — отдельный тип. */
export const GANTT_DOMAIN_TASK_TYPE = 'domain';

export const GANTT_TASK_TYPES = [
  { id: 'task', label: 'Задача' },
  { id: 'summary', label: 'Сводная' },
  { id: GANTT_DOMAIN_TASK_TYPE, label: 'Этап' },
];

export const GANTT_DOMAIN_ENTITY_KINDS = new Set([
  'project',
  'contract',
  'stage',
  'workPackage',
]);

export function isGanttDomainEntityKind(kind: string | undefined): boolean {
  return Boolean(kind && GANTT_DOMAIN_ENTITY_KINDS.has(kind));
}
