import type { ILink, ITask } from '@svar-ui/react-gantt';
import { describe, expect, it } from 'vitest';

import { autoScheduleFs, endFromStartAndDuration } from './autoScheduleFs';
import { computeCriticalPath } from './criticalPath';
import { cloneGanttTasks } from './ganttApi';
import { mapAllMockProjectsToGantt } from './mapHierarchyToGantt';
import { GANTT_MOCK_PROJECTS } from '../mock/ganttHierarchyMock';

function day(iso: string): Date {
  const [year, month, dayNum] = iso.split('-').map(Number);
  return new Date(year, month - 1, dayNum);
}

function task(partial: Partial<ITask> & Pick<ITask, 'id' | 'text'>): ITask {
  const start = partial.start ?? day('2026-01-01');
  const duration = partial.duration ?? 5;
  return {
    type: 'task',
    parent: 0,
    progress: 0,
    ...partial,
    start,
    duration,
    end: partial.end ?? endFromStartAndDuration(start, duration),
  };
}

describe('computeCriticalPath', () => {
  it('marks A→B→C chain as critical when no parallel slack', () => {
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-03-02'), duration: 5 }),
      task({ id: 'b', text: 'B', start: day('2026-03-10'), duration: 3 }),
      task({ id: 'c', text: 'C', start: day('2026-03-13'), duration: 2 }),
    ];
    const links: ILink[] = [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'c', type: 'e2s' },
    ];

    const result = computeCriticalPath(tasks, links);
    expect([...result.taskIds].sort()).toEqual(['a', 'b', 'c']);
    expect([...result.linkIds].sort()).toEqual(['l1', 'l2']);
  });

  it('excludes parallel branch with float', () => {
    // A(5) → B(3) → C(2)  и  A → D(1) параллельно с большим float
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-03-02'), duration: 5 }),
      task({ id: 'b', text: 'B', start: day('2026-03-10'), duration: 3 }),
      task({ id: 'c', text: 'C', start: day('2026-03-13'), duration: 2 }),
      task({ id: 'd', text: 'D', start: day('2026-03-10'), duration: 1 }),
    ];
    const links: ILink[] = [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'c', type: 'e2s' },
      { id: 'l3', source: 'a', target: 'd', type: 'e2s' },
    ];

    const result = computeCriticalPath(tasks, links);
    expect(result.taskIds.has('a')).toBe(true);
    expect(result.taskIds.has('b')).toBe(true);
    expect(result.taskIds.has('c')).toBe(true);
    expect(result.taskIds.has('d')).toBe(false);
    expect(result.linkIds.has('l3')).toBe(false);
  });

  it('marks demo critical chain and excludes short parallel', () => {
    const tasks: ITask[] = [
      task({ id: 'mock-cp-t1', text: '1', start: day('2026-06-01'), duration: 10 }),
      task({ id: 'mock-cp-t2', text: '2', start: day('2026-06-15'), duration: 20 }),
      task({ id: 'mock-cp-t3', text: '3', start: day('2026-07-13'), duration: 30 }),
      task({ id: 'mock-cp-t4', text: '4', start: day('2026-08-24'), duration: 10 }),
      task({ id: 'mock-cp-side', text: 'side', start: day('2026-06-15'), duration: 3 }),
    ];
    const links: ILink[] = [
      { id: 'cp-l1', source: 'mock-cp-t1', target: 'mock-cp-t2', type: 'e2s' },
      { id: 'cp-l2', source: 'mock-cp-t2', target: 'mock-cp-t3', type: 'e2s' },
      { id: 'cp-l3', source: 'mock-cp-t3', target: 'mock-cp-t4', type: 'e2s' },
      { id: 'cp-l-side', source: 'mock-cp-t1', target: 'mock-cp-side', type: 'e2s' },
    ];

    const result = computeCriticalPath(tasks, links);
    expect(result.taskIds.has('mock-cp-t1')).toBe(true);
    expect(result.taskIds.has('mock-cp-t2')).toBe(true);
    expect(result.taskIds.has('mock-cp-t3')).toBe(true);
    expect(result.taskIds.has('mock-cp-t4')).toBe(true);
    expect(result.taskIds.has('mock-cp-side')).toBe(false);
  });

  it('keeps DEMO critical when longer projects share the same chart', () => {
    const chart = mapAllMockProjectsToGantt(GANTT_MOCK_PROJECTS);
    const scheduled = autoScheduleFs(cloneGanttTasks(chart.tasks), chart.links);
    const result = computeCriticalPath(scheduled, chart.links);

    expect(result.taskIds.has('mock-cp-t1')).toBe(true);
    expect(result.taskIds.has('mock-cp-t2')).toBe(true);
    expect(result.taskIds.has('mock-cp-t3')).toBe(true);
    expect(result.taskIds.has('mock-cp-t4')).toBe(true);
    expect(result.taskIds.has('mock-cp-side')).toBe(false);
  });
});
