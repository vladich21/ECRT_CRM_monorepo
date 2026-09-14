import type { SwItemListRow, SwStructureNode } from '@/types/swRegistry';

/** Программы, разложенные по элементу структуры, к которому они привязаны. */
export function groupProgramsByElement(items: SwItemListRow[]): Map<string, SwItemListRow[]> {
  const byElement = new Map<string, SwItemListRow[]>();
  items.forEach(item => {
    const list = byElement.get(item.element.id);
    if (list) list.push(item);
    else byElement.set(item.element.id, [item]);
  });
  return byElement;
}

export type SwNodeCounts = { programs: number; documents: number };

/**
 * Счётчики программ и документов с каскадом на потомков: узел отвечает за всю свою ветку,
 * поэтому у элемента верхнего уровня видно наполнение целиком, без раскрытия дерева.
 */
export function buildNodeCounts(
  nodes: SwStructureNode[],
  programsByElement: Map<string, SwItemListRow[]>,
): Map<string, SwNodeCounts> {
  const counts = new Map<string, SwNodeCounts>();

  const walk = (node: SwStructureNode): SwNodeCounts => {
    const own = programsByElement.get(node.id) ?? [];
    let programs = own.length;
    let documents = own.reduce((sum, item) => sum + (item.documentsCount ?? 0), 0);

    (node.children ?? []).forEach(child => {
      const childCounts = walk(child);
      programs += childCounts.programs;
      documents += childCounts.documents;
    });

    const result: SwNodeCounts = { programs, documents };
    counts.set(node.id, result);
    return result;
  };

  nodes.forEach(walk);
  return counts;
}

/** Программы всей ветки узла — сначала свои, затем потомков, в порядке обхода дерева. */
export function collectBranchPrograms(
  node: SwStructureNode,
  programsByElement: Map<string, SwItemListRow[]>,
): SwItemListRow[] {
  const result: SwItemListRow[] = [...(programsByElement.get(node.id) ?? [])];
  (node.children ?? []).forEach(child => {
    result.push(...collectBranchPrograms(child, programsByElement));
  });
  return result;
}
