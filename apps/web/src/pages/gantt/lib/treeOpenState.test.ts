import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import type { ITask } from '@svar-ui/react-gantt';

import { applyOpenState, loadOpenIds, patchOpenId, saveOpenIds } from './treeOpenState';

const STORAGE_KEY = 'srn.gantt.treeOpen.v1';

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('treeOpenState', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('patchOpenId merges without wiping other ids', () => {
    saveOpenIds(['project-1', 'contract-1']);
    patchOpenId('stage-1', true);
    expect([...loadOpenIds()].sort()).toEqual(['contract-1', 'project-1', 'stage-1']);

    patchOpenId('contract-1', false);
    expect([...loadOpenIds()].sort()).toEqual(['project-1', 'stage-1']);
  });

  it('applyOpenState sets open only on branches present in storage', () => {
    const tasks: ITask[] = [
      { id: 'p1', text: 'P', type: 'summary', parent: 0, open: false },
      { id: 'c1', text: 'C', type: 'summary', parent: 'p1', open: false },
      { id: 't1', text: 'T', type: 'task', parent: 'c1' },
    ];

    const result = applyOpenState(tasks, new Set(['p1']));
    expect(result.find(t => t.id === 'p1')?.open).toBe(true);
    expect(result.find(t => t.id === 'c1')?.open).toBe(false);
    expect(result.find(t => t.id === 't1')?.open).toBeUndefined();
  });
});
