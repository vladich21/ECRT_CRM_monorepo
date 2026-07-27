import type { GanttHierarchyResponse } from '../../../types/gantt';

/**
 * Сигнатура дерева для remount SVAR: меняется при появлении/исчезновении
 * узлов, смене бюджетов и часов — без лишних remount при том же составе.
 */
export function hierarchyChartKey(data: GanttHierarchyResponse | undefined): string {
  if (!data?.projects?.length) return 'empty';

  const parts: string[] = [];

  const walkTasks = (
    nodes: Array<{
      id: string;
      budget?: number | null;
      planned_hours?: number;
      actual_hours?: number;
      children?: unknown[];
    }>,
  ) => {
    for (const node of nodes) {
      parts.push(
        `${node.id}:${node.budget ?? 0}:${node.planned_hours ?? 0}:${node.actual_hours ?? 0}`,
      );
      if (Array.isArray(node.children) && node.children.length > 0) {
        walkTasks(node.children as typeof nodes);
      }
    }
  };

  walkTasks(data.projects);
  parts.push(`l${data.links?.length ?? 0}`);
  return parts.join('|');
}
