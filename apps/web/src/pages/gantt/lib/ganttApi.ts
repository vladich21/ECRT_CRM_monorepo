import type { IApi, ILink, ITask } from '@svar-ui/react-gantt';

import { getCurrentMonthRange, monthToScrollLeft } from './currentMonthView';

export function cloneGanttTasks(tasks: ITask[]): ITask[] {
  return tasks.map(task => ({
    ...task,
    start: task.start ? new Date(task.start) : task.start,
    end: task.end ? new Date(task.end) : task.end,
    deadline:
      task.deadline instanceof Date
        ? new Date(task.deadline)
        : task.deadline
          ? new Date(task.deadline as string | number)
          : task.deadline,
  }));
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
