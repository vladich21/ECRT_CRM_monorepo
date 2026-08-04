import type { IApi } from '@svar-ui/react-gantt';

import { dateToScrollLeft, getCurrentMonthRange, monthToScrollLeft } from './currentMonthView';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function markerLeft(api: IApi, today: Date): number | null {
  const state = api.getState();
  const scaleStart = (state._start ?? state.start) as Date | undefined;
  const cellWidth = (state.cellWidth ?? state._cellWidth ?? 0) as number;
  if (!scaleStart || !cellWidth) return null;

  const scales = state._scales as { minUnit?: string } | undefined;
  const minUnit = scales?.minUnit ?? 'day';

  if (minUnit === 'month' || minUnit === 'year') {
    const { daysInMonth } = getCurrentMonthRange(today);
    const monthLeft = monthToScrollLeft(today, scaleStart, cellWidth);
    const dayOffset = ((today.getDate() - 1) / daysInMonth) * cellWidth;
    return monthLeft + dayOffset;
  }

  return dateToScrollLeft(today, scaleStart, cellWidth);
}

export function attachTodayMarker(api: IApi): () => void {
  const tag = { tag: 'gantt-today-marker' };
  api.detach(tag.tag);

  const apply = () => {
    const today = startOfToday();
    const left = markerLeft(api, today);
    if (left == null) return;

    try {
      api.getStores().data.setState({
        markers: [{ id: 'today', start: today, text: 'Сегодня', css: 'gantt-today-marker' }],
        _markers: [{ id: 'today', left, text: 'Сегодня', css: 'gantt-today-marker' }],
      } as never);
    } catch {
      /* ignore */
    }
  };

  apply();

  for (const event of ['zoom-scale', 'expand-scale', 'scroll-chart'] as const) {
    api.on(event, () => apply(), tag);
  }

  const timer = window.setInterval(apply, 60_000);

  return () => {
    api.detach(tag.tag);
    window.clearInterval(timer);
  };
}
