import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearChartSnapshot,
  loadChartSnapshot,
  saveChartSnapshot,
} from './chartPersist';

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

describe('chartPersist', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    clearChartSnapshot();
  });

  it('round-trips tasks with revived Date fields', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());

    saveChartSnapshot(
      [
        {
          id: 't1',
          text: 'Task',
          type: 'task',
          parent: 's1',
          start: new Date(2026, 0, 10),
          end: new Date(2026, 0, 20),
          entityKind: 'task',
        },
      ],
      [{ id: 'l1', source: 't1', target: 't1', type: 'e2s' }],
    );

    const loaded = loadChartSnapshot();
    expect(loaded).not.toBeNull();
    expect(loaded?.tasks[0]?.start).toBeInstanceOf(Date);
    expect(loaded?.tasks[0]?.end).toBeInstanceOf(Date);
    expect(loaded?.tasks[0]?.text).toBe('Task');
    expect(loaded?.links).toHaveLength(1);
  });

  it('returns null when storage empty', () => {
    vi.stubGlobal('localStorage', createMemoryStorage());
    expect(loadChartSnapshot()).toBeNull();
  });
});
