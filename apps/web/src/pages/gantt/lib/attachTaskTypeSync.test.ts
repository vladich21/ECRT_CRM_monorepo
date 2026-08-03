import { describe, expect, it } from 'vitest';

import {
  canMoveWithinHierarchy,
  isAllowedParent,
  resolveSiblingReorderMove,
} from './attachHierarchyMoveGuard';
import { resolveSvarType } from './attachTaskTypeSync';

type Node = {
  id: string;
  parent?: string | number;
  entityKind?: string;
  type?: string;
};

function makeTasks(nodes: Node[]) {
  const byIdMap = new Map(nodes.map(n => [n.id, n]));
  const children = new Map<string, Node[]>();
  for (const n of nodes) {
    const key = String(n.parent ?? 0);
    const list = children.get(key) ?? [];
    list.push(n);
    children.set(key, list);
  }

  return {
    byId: (id: string | number) => byIdMap.get(String(id)),
    getBranch: (id: string | number) => {
      const node = byIdMap.get(String(id));
      if (!node) return [];
      return children.get(String(node.parent ?? 0)) ?? [];
    },
    getIndexById: (id: string | number) => {
      const node = byIdMap.get(String(id));
      if (!node) return -1;
      const branch = children.get(String(node.parent ?? 0)) ?? [];
      return branch.findIndex(n => n.id === String(id));
    },
  };
}

const tree = makeTasks([
  { id: 'p1', entityKind: 'project', parent: 0 },
  { id: 'p2', entityKind: 'project', parent: 0 },
  { id: 'c', entityKind: 'contract', parent: 'p1' },
  { id: 's', entityKind: 'stage', parent: 'c' },
  { id: 't1', entityKind: 'task', parent: 's' },
  { id: 't2', entityKind: 'task', parent: 's' },
  { id: 't3', entityKind: 'task', parent: 's' },
]);

describe('canMoveWithinHierarchy up/down', () => {
  it('allows ↑↓ among siblings inside stage', () => {
    expect(canMoveWithinHierarchy(tree as never, { id: 't2', mode: 'up' })).toBe(true);
    expect(canMoveWithinHierarchy(tree as never, { id: 't2', mode: 'down' })).toBe(true);
  });

  it('blocks ↑ on first sibling (SVAR would promote to parent level)', () => {
    expect(canMoveWithinHierarchy(tree as never, { id: 't1', mode: 'up' })).toBe(false);
  });

  it('blocks ↓ on last sibling (SVAR would promote to parent level)', () => {
    expect(canMoveWithinHierarchy(tree as never, { id: 't3', mode: 'down' })).toBe(false);
  });
});

describe('project nesting', () => {
  it('never allows project as child of project', () => {
    expect(
      canMoveWithinHierarchy(tree as never, { id: 'p1', mode: 'child', target: 'p2' }),
    ).toBe(false);
  });

  it('allows reordering projects at root via before/after', () => {
    expect(
      canMoveWithinHierarchy(tree as never, { id: 'p2', mode: 'before', target: 'p1' }),
    ).toBe(true);
  });

  it('resolveSiblingReorderMove maps ↓ to after next project sibling', () => {
    expect(resolveSiblingReorderMove(tree as never, 'p1', 'down')).toEqual({
      id: 'p1',
      mode: 'after',
      target: 'p2',
    });
  });
});

describe('isAllowedParent', () => {
  it('allows task under stage / workPackage / task', () => {
    expect(isAllowedParent('task', 'stage')).toBe(true);
    expect(isAllowedParent('task', 'workPackage')).toBe(true);
    expect(isAllowedParent('task', 'task')).toBe(true);
    expect(isAllowedParent('task', 'project')).toBe(false);
  });

  it('disallows project under project', () => {
    expect(isAllowedParent('project', 'project')).toBe(false);
    expect(isAllowedParent('project', null)).toBe(true);
  });
});

describe('resolveSvarType', () => {
  it('keeps domain containers as domain type (fixed timeline, no child rollup)', () => {
    expect(resolveSvarType({ entityKind: 'stage', type: 'task' }, 3)).toBe('domain');
    expect(resolveSvarType({ entityKind: 'project', type: 'task' }, 1)).toBe('domain');
  });

  it('promotes parent with children to summary', () => {
    expect(resolveSvarType({ entityKind: 'task', type: 'task' }, 2)).toBe('summary');
  });

  it('demotes leaf task to task', () => {
    expect(resolveSvarType({ entityKind: 'task', type: 'summary' }, 0)).toBe('task');
  });

  it('keeps milestone', () => {
    expect(resolveSvarType({ entityKind: 'task', type: 'milestone' }, 0)).toBe('milestone');
  });
});
