import type { ILink, ITask } from '@svar-ui/react-gantt';
import { describe, expect, it, vi } from 'vitest';

import { autoScheduleFs, durationFromRange, endFromStartAndDuration } from './autoScheduleFs';
import { isWorkingDay, nextWorkingDay, startAfterPredecessorEnd } from './workCalendar';

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

describe('workCalendar', () => {
  it('treats Saturday and holidays as non-working', () => {
    expect(isWorkingDay(day('2026-03-07'))).toBe(false); // суббота
    expect(isWorkingDay(day('2026-03-08'))).toBe(false); // воскресенье + 8 марта
    expect(isWorkingDay(day('2026-03-09'))).toBe(false); // перенос праздника в календаре
    expect(isWorkingDay(day('2026-03-10'))).toBe(true); // вторник
  });

  it('nextWorkingDay skips weekend', () => {
    expect(nextWorkingDay(day('2026-03-07')).getTime()).toBe(day('2026-03-10').getTime());
  });

  it('startAfterPredecessorEnd skips weekend after Friday end', () => {
    // пятница 6 марта → старт со вторника 10 марта (сб/вс + пн 9 — праздник)
    expect(startAfterPredecessorEnd(day('2026-03-06')).getTime()).toBe(day('2026-03-10').getTime());
  });
});

describe('autoScheduleFs', () => {
  it('shifts B and C when A moves later (A→B→C FS chain)', () => {
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-03-02'), duration: 5 }), // пн–пт
      task({ id: 'b', text: 'B', start: day('2026-01-10'), duration: 3 }),
      task({ id: 'c', text: 'C', start: day('2026-01-15'), duration: 2 }),
    ];
    const links: ILink[] = [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'c', type: 'e2s' },
    ];

    const result = autoScheduleFs(tasks, links);
    const byId = Object.fromEntries(result.map(item => [String(item.id), item]));

    // A: 2–6 марта
    expect(byId.a.start?.getTime()).toBe(day('2026-03-02').getTime());
    expect(byId.a.end?.getTime()).toBe(day('2026-03-06').getTime());

    // B стартует в первый рабочий после 6.03 → 10.03
    expect(byId.b.start?.getTime()).toBe(day('2026-03-10').getTime());
    expect(byId.b.end?.getTime()).toBe(day('2026-03-12').getTime());

    expect(byId.c.start?.getTime()).toBe(day('2026-03-13').getTime());
    expect(byId.c.end?.getTime()).toBe(day('2026-03-14').getTime());
  });

  it('does not start successor on weekend after Friday predecessor end', () => {
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-03-06'), duration: 1 }),
      task({ id: 'b', text: 'B', start: day('2026-01-01'), duration: 2 }),
    ];
    const links: ILink[] = [{ id: 'l1', source: 'a', target: 'b', type: 'e2s' }];

    const result = autoScheduleFs(tasks, links);
    const b = result.find(item => item.id === 'b');
    expect(b?.start?.getTime()).toBe(day('2026-03-10').getTime());
  });

  it('does not throw and leaves tasks unchanged on FS cycle', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-02-01'), duration: 2 }),
      task({ id: 'b', text: 'B', start: day('2026-02-05'), duration: 2 }),
    ];
    const links: ILink[] = [
      { id: 'l1', source: 'a', target: 'b', type: 'e2s' },
      { id: 'l2', source: 'b', target: 'a', type: 'e2s' },
    ];

    const result = autoScheduleFs(tasks, links);
    expect(result[0]?.start?.getTime()).toBe(day('2026-02-01').getTime());
    expect(result[1]?.start?.getTime()).toBe(day('2026-02-05').getTime());
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not rewrite unrelated leaf ends when no FS push is needed', () => {
    const tasks: ITask[] = [
      task({ id: 'a', text: 'A', start: day('2026-03-02'), duration: 5 }),
      task({ id: 'b', text: 'B', start: day('2026-03-20'), duration: 3 }),
      task({ id: 'c', text: 'C', start: day('2026-04-01'), duration: 2 }),
    ];
    const links: ILink[] = [{ id: 'l1', source: 'a', target: 'b', type: 'e2s' }];

    const result = autoScheduleFs(tasks, links);
    const byId = Object.fromEntries(result.map(item => [String(item.id), item]));

    expect(byId.a.end?.getTime()).toBe(day('2026-03-06').getTime());
    expect(byId.b.start?.getTime()).toBe(day('2026-03-20').getTime());
    expect(byId.b.end?.getTime()).toBe(day('2026-03-22').getTime());
    expect(byId.c.start?.getTime()).toBe(day('2026-04-01').getTime());
    expect(byId.c.end?.getTime()).toBe(day('2026-04-02').getTime());
  });

  it('does not rollup domain/stage dates on the client', () => {
    const stageStart = day('2026-01-01');
    const stageEnd = day('2026-01-31');
    const tasks: ITask[] = [
      {
        id: 'sum',
        text: 'Stage',
        type: 'domain',
        parent: 0,
        open: true,
        start: stageStart,
        end: stageEnd,
        duration: 31,
        entityKind: 'stage',
      } as ITask,
      task({ id: 'a', text: 'A', parent: 'sum', start: day('2026-03-02'), duration: 5 }),
      task({ id: 'b', text: 'B', parent: 'sum', start: day('2026-01-10'), duration: 3 }),
    ];
    const links: ILink[] = [{ id: 'l1', source: 'a', target: 'b', type: 'e2s' }];

    const result = autoScheduleFs(tasks, links);
    const summary = result.find(item => item.id === 'sum');
    const b = result.find(item => item.id === 'b');

    expect(b?.start?.getTime()).toBe(day('2026-03-10').getTime());
    expect(summary?.start?.getTime()).toBe(stageStart.getTime());
    expect(summary?.end?.getTime()).toBe(stageEnd.getTime());
    expect(summary?.duration).toBe(31);
  });

  it('does not change project/contract/stage dates without FS links', () => {
    const projectStart = day('2024-04-01');
    const projectEnd = day('2028-04-01');
    const stageEnd = day('2027-01-02');
    const tasks = [
      {
        ...task({
          id: 'p',
          text: 'Project',
          type: 'summary',
          start: projectStart,
          end: projectEnd,
          duration: durationFromRange(projectStart, projectEnd),
        }),
        entityKind: 'project',
      },
      {
        ...task({
          id: 'c',
          text: 'Contract',
          type: 'summary',
          parent: 'p',
          start: day('2024-04-01'),
          end: day('2027-01-02'),
        }),
        entityKind: 'contract',
      },
      {
        ...task({
          id: 's',
          text: 'Stage',
          type: 'summary',
          parent: 'c',
          start: day('2024-04-01'),
          end: stageEnd,
        }),
        entityKind: 'stage',
      },
      task({ id: 't', text: 'Task', parent: 's', start: day('2025-01-01'), duration: 10 }),
    ];

    const result = autoScheduleFs(tasks as ITask[], []);
    const project = result.find(item => item.id === 'p');
    const contract = result.find(item => item.id === 'c');
    const stage = result.find(item => item.id === 's');

    expect(project?.start?.getTime()).toBe(projectStart.getTime());
    expect(project?.end?.getTime()).toBe(projectEnd.getTime());
    expect(contract?.end?.getTime()).toBe(day('2027-01-02').getTime());
    expect(stage?.end?.getTime()).toBe(stageEnd.getTime());
  });
});
