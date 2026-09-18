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

export type SwStructureSearchResult = {
  tree: SwStructureNode[];
  /** Программы, которые остаются видны под узлами отфильтрованного дерева. */
  programsByElement: Map<string, SwItemListRow[]>;
  /** Узлы, которые надо раскрыть, иначе найденное внутри свёрнутой ветки не видно. */
  expandIds: Set<string>;
  /** Сколько программ осталось в выдаче. */
  programCount: number;
};

/**
 * Поиск по дереву вместе с программами: элемент ищется по коду и наименованию, программа — по обозначению,
 * краткому и полному наименованию. Нашёлся сам элемент — видны все его программы; не нашёлся — только
 * найденные программы, а ветка до них сохраняется. Раскрываются узлы, внутри которых есть находка.
 */
export function searchStructureTree(
  nodes: SwStructureNode[],
  programsByElement: Map<string, SwItemListRow[]>,
  query: string,
): SwStructureSearchResult {
  const q = query.trim().toLowerCase();
  if (!q) {
    let programCount = 0;
    programsByElement.forEach(list => {
      programCount += list.length;
    });
    return { tree: nodes, programsByElement, expandIds: new Set(), programCount };
  }

  const visiblePrograms = new Map<string, SwItemListRow[]>();
  const expandIds = new Set<string>();
  let programCount = 0;

  const programMatches = (item: SwItemListRow) =>
    `${item.designation} ${item.shortName} ${item.fullName}`.toLowerCase().includes(q);

  const match = (node: SwStructureNode): SwStructureNode | null => {
    const children = (node.children ?? []).map(match).filter((n): n is SwStructureNode => n != null);
    const own = programsByElement.get(node.id) ?? [];
    const ownMatched = own.filter(programMatches);
    const selfMatched = `${node.code} ${node.name}`.toLowerCase().includes(q);
    if (!selfMatched && children.length === 0 && ownMatched.length === 0) return null;

    const kept = selfMatched ? own : ownMatched;
    if (kept.length > 0) {
      visiblePrograms.set(node.id, kept);
      programCount += kept.length;
    }
    // Раскрываем только ради находок внутри: совпавший сам элемент остаётся свёрнутым, как обычно.
    if (children.length > 0 || ownMatched.length > 0) expandIds.add(node.id);
    return { ...node, children };
  };

  const tree = nodes.map(match).filter((n): n is SwStructureNode => n != null);
  return { tree, programsByElement: visiblePrograms, expandIds, programCount };
}

/**
 * Дерево вкладки «Архивные»: архивные элементы и элементы с архивными программами — вместе с веткой до них.
 * Без ветки архивный элемент под действующим родителем и программа, ушедшая в архив одна, на вкладке не видны.
 * Действующие элементы остаются в дереве только как путь к архивному.
 */
export function archivedStructureTree(
  nodes: SwStructureNode[],
  archivedProgramsByElement: Map<string, SwItemListRow[]>,
): SwStructureNode[] {
  const keep = (node: SwStructureNode): SwStructureNode | null => {
    const children = (node.children ?? []).map(keep).filter((n): n is SwStructureNode => n != null);
    const hasArchivedPrograms = (archivedProgramsByElement.get(node.id)?.length ?? 0) > 0;
    if (node.recordState !== 'archived' && !hasArchivedPrograms && children.length === 0) return null;
    return { ...node, children };
  };
  return nodes.map(keep).filter((n): n is SwStructureNode => n != null);
}

/** Сколько архивных элементов в дереве — на любой глубине, в том числе под действующими родителями. */
export function countArchivedElements(nodes: SwStructureNode[]): number {
  return nodes.reduce(
    (sum, node) => sum + (node.recordState === 'archived' ? 1 : 0) + countArchivedElements(node.children ?? []),
    0,
  );
}

export type SwProgramResponsible = { id: string; name: string; programs: SwItemListRow[] };

/** Ответственные программ: каждый человек один раз, со списком программ, за которые он отвечает; по алфавиту. */
export function groupProgramsByResponsible(programs: SwItemListRow[]): SwProgramResponsible[] {
  const byUser = new Map<string, SwProgramResponsible>();
  programs.forEach(item => {
    const { id, name } = item.responsible;
    const entry = byUser.get(id);
    if (entry) entry.programs.push(item);
    else byUser.set(id, { id, name, programs: [item] });
  });
  return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
