import type { IApi } from '@svar-ui/react-gantt';

import { dateToScrollLeft, getCurrentMonthRange, monthToScrollLeft } from './currentMonthView';

type ZoomScaleEvent = {
  dir?: number;
  date?: Date;
  offset?: number;
};

function dayFractionInMonth(date: Date): number {
  const { daysInMonth } = getCurrentMonthRange(date);
  return (date.getDate() - 1) / daysInMonth;
}

/** scrollLeft так, чтобы `date` оказалась под курсором (offset от левого края chart). */
export function scrollLeftForZoomAnchor(
  date: Date,
  scaleStart: Date,
  cellWidth: number,
  minUnit: string,
  offset: number,
): number {
  let dateLeft: number;
  if (minUnit === 'month' || minUnit === 'year') {
    dateLeft = monthToScrollLeft(date, scaleStart, cellWidth) + dayFractionInMonth(date) * cellWidth;
  } else {
    dateLeft = dateToScrollLeft(date, scaleStart, cellWidth);
  }
  return Math.max(0, Math.round(dateLeft - offset));
}

/**
 * SVAR zoom-scale внутри считает scroll через hour-diff — при смене уровня
 * (месяцы ↔ дни) точка под курсором уезжает. После зума восстанавливаем якорь.
 */
export function attachZoomAnchor(api: IApi, chartRoot: HTMLElement): () => void {
  const tag = { tag: 'gantt-zoom-anchor' };
  api.detach(tag.tag);

  api.on(
    'zoom-scale',
    (ev: ZoomScaleEvent) => {
      window.requestAnimationFrame(() => {
        const state = api.getState() as {
          _start?: Date;
          start?: Date;
          cellWidth?: number;
          _cellWidth?: number;
          _scales?: { minUnit?: string };
          _scaleDate?: Date;
          _zoomOffset?: number;
          scrollLeft?: number;
        };

        const scaleStart = state._start ?? state.start;
        const cellWidth = state.cellWidth ?? state._cellWidth;
        const minUnit = state._scales?.minUnit ?? 'day';
        const date = ev.date ?? state._scaleDate;
        const offset = ev.offset ?? state._zoomOffset;
        if (!scaleStart || !cellWidth || !date || offset == null) return;

        const left = scrollLeftForZoomAnchor(date, scaleStart, cellWidth, minUnit, offset);
        const chartEl = chartRoot.querySelector('.wx-chart') as HTMLElement | null;
        if (chartEl) chartEl.scrollLeft = left;
        void api.exec('scroll-chart', { left });
      });
    },
    tag,
  );

  return () => {
    api.detach(tag.tag);
  };
}
