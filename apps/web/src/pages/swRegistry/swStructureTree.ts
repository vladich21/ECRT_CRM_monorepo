import type { SwStructureNode } from '@/types/swRegistry';

export function flattenStructureOptions(
  nodes: SwStructureNode[],
  prefix = '',
  excludeIds?: Set<string>,
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const node of nodes) {
    if (excludeIds?.has(node.id)) continue;
    const label = prefix ? `${prefix} / ${node.code} ${node.name}` : `${node.code} ${node.name}`;
    out.push({ value: node.id, label });
    out.push(...flattenStructureOptions(node.children ?? [], label, excludeIds));
  }
  return out;
}

export function collectSubtreeIds(node: SwStructureNode): Set<string> {
  const ids = new Set<string>([node.id]);
  for (const child of node.children ?? []) {
    for (const id of collectSubtreeIds(child)) ids.add(id);
  }
  return ids;
}

export function countStructureNodes(nodes: SwStructureNode[]): number {
  return nodes.reduce((n, node) => n + 1 + countStructureNodes(node.children ?? []), 0);
}

export function findStructureNode(nodes: SwStructureNode[], id: string): SwStructureNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findStructureNode(node.children ?? [], id);
    if (found) return found;
  }
  return null;
}

export function findStructureParent(nodes: SwStructureNode[], id: string): SwStructureNode | null {
  for (const node of nodes) {
    if ((node.children ?? []).some(c => c.id === id)) return node;
    const found = findStructureParent(node.children ?? [], id);
    if (found) return found;
  }
  return null;
}

export function collectStructurePathIds(nodes: SwStructureNode[], targetId: string): string[] {
  const walk = (list: SwStructureNode[], path: string[]): string[] | null => {
    for (const node of list) {
      const next = [...path, node.id];
      if (node.id === targetId) return next;
      const child = walk(node.children ?? [], next);
      if (child) return child;
    }
    return null;
  };
  return walk(nodes, []) ?? [];
}

export function firstStructureNode(nodes: SwStructureNode[]): SwStructureNode | null {
  if (nodes.length === 0) return null;
  return nodes[0];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
}
