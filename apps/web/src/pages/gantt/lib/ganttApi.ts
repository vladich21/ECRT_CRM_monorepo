import type { IApi, ILink, ITask } from '@svar-ui/react-gantt';

import { getCurrentMonthRange, monthToScrollLeft } from './currentMonthView';

function cloneDate(value: unknown): Date | null | undefined {
  if (value == null) return value as null | undefined;
  if (value instanceof Date) return new Date(value.getTime());
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function cloneGanttTasks(tasks: ITask[]): ITask[] {
  return tasks.map(task => {
    const extra = task as ITask & {
      boundStart?: unknown;
      timelineStart?: unknown;
      timelineEnd?: unknown;
    };
    return {
      ...task,
      start: cloneDate(task.start) ?? task.start,
      end: cloneDate(task.end) ?? task.end,
      deadline: cloneDate(task.deadline) ?? task.deadline,
      boundStart: cloneDate(extra.boundStart) ?? extra.boundStart,
      timelineStart: cloneDate(extra.timelineStart) ?? extra.timelineStart,
      timelineEnd: cloneDate(extra.timelineEnd) ?? extra.timelineEnd,
    };
  });
}

/** Links в store — DataArray с serialize(), не всегда plain array. */
export function linksFromApi(api: IApi, fallback: ILink[] = []): ILink[] {
  const raw = api.getState().links as unknown;

  if (Array.isArray(raw)) {
    return raw as ILink[];
  }

  if (
    raw &&
    typeof raw === 'object' &&
    'serialize' in raw &&
    typeof (raw as { serialize: () => ILink[] }).serialize === 'function'
  ) {
    return (raw as { serialize: () => ILink[] }).serialize();
  }

  return fallback;
}

export function scrollChartToCurrentMonth(api: IApi, chartEl: HTMLElement): void {
  const { start: monthStart } = getCurrentMonthRange();
  const state = api.getState();
  const scaleStart = (state._start ?? state.start) as Date | undefined;
  const cellWidth = (state.cellWidth ?? state._cellWidth ?? 80) as number;
  if (!scaleStart) return;

  const left = monthToScrollLeft(monthStart, scaleStart, cellWidth);
  chartEl.scrollLeft = left;
  void api.exec('scroll-chart', { left });
}
