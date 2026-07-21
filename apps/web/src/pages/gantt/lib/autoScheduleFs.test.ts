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

  it('rolls summary dates from children after leaf scheduling', () => {
    const tasks: ITask[] = [
      {
        id: 'sum',
        text: 'Summary',
        type: 'summary',
        parent: 0,
        open: true,
        start: day('2026-01-01'),
        end: day('2026-01-31'),
        duration: 31,
      },
      task({ id: 'a', text: 'A', parent: 'sum', start: day('2026-03-02'), duration: 5 }),
      task({ id: 'b', text: 'B', parent: 'sum', start: day('2026-01-10'), duration: 3 }),
    ];
    const links: ILink[] = [{ id: 'l1', source: 'a', target: 'b', type: 'e2s' }];

    const result = autoScheduleFs(tasks, links);
    const summary = result.find(item => item.id === 'sum');
    const b = result.find(item => item.id === 'b');

    expect(b?.start?.getTime()).toBe(day('2026-03-10').getTime());
    expect(summary?.start?.getTime()).toBe(day('2026-03-02').getTime());
    expect(summary?.end?.getTime()).toBe(b?.end?.getTime());
    expect(summary?.duration).toBe(durationFromRange(summary!.start!, summary!.end!));
  });
});
