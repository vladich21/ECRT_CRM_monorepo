import type { GanttHierarchyResponse } from '../../../types/gantt';

type HierarchyWalkNode = {
  id: string;
  children?: HierarchyWalkNode[];
};

/**
 * Сигнатура дерева для remount SVAR: только состав узлов и связей.
 * Часы/бюджеты меняются без полного remount диаграммы.
 */
export function hierarchyChartKey(data: GanttHierarchyResponse | undefined): string {
  if (!data?.projects?.length) return 'empty';

  const parts: string[] = [];

  const walk = (nodes: HierarchyWalkNode[]) => {
    for (const node of nodes) {
      parts.push(String(node.id));
      if (Array.isArray(node.children) && node.children.length > 0) {
        walk(node.children);
      }
    }
  };

  walk(data.projects);
  parts.push(`l${data.links?.length ?? 0}`);
  return parts.join('|');
}
