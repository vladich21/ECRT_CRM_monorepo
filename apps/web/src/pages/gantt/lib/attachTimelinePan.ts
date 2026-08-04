import type { IApi } from '@svar-ui/react-gantt';

function findChart(root: HTMLElement): HTMLElement | null {
  return root.querySelector('.wx-chart');
}

function findTableScroll(root: HTMLElement): HTMLElement | null {
  return (
    root.querySelector('.wx-table-container .wx-body') ||
    root.querySelector('.wx-grid .wx-body') ||
    root.querySelector('.wx-table .wx-body')
  );
}

const DEAD_ZONE_PX = 10;
const MAX_SPEED = 28;

type ScrollDir = 'none' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function directionCursor(dir: ScrollDir): string {
  switch (dir) {
    case 'n':
      return 'n-resize';
    case 's':
      return 's-resize';
    case 'e':
      return 'e-resize';
    case 'w':
      return 'w-resize';
    case 'ne':
      return 'ne-resize';
    case 'nw':
      return 'nw-resize';
    case 'se':
      return 'se-resize';
    case 'sw':
      return 'sw-resize';
    default:
      return 'move';
  }
}

function resolveDirection(dx: number, dy: number): ScrollDir {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < DEAD_ZONE_PX && ay < DEAD_ZONE_PX) return 'none';

  const dominantHorizontal = ax >= ay * 1.2;
  const dominantVertical = ay >= ax * 1.2;

  if (dominantHorizontal) return dx > 0 ? 'e' : 'w';
  if (dominantVertical) return dy > 0 ? 's' : 'n';

  if (dy < 0 && dx > 0) return 'ne';
  if (dy < 0 && dx < 0) return 'nw';
  if (dy > 0 && dx > 0) return 'se';
  return 'sw';
}

function speedFromDelta(delta: number): number {
  const abs = Math.abs(delta);
  if (abs < DEAD_ZONE_PX) return 0;
  const t = Math.min(1, (abs - DEAD_ZONE_PX) / 160);
  const eased = t * t;
  return Math.sign(delta) * (2 + eased * (MAX_SPEED - 2));
}

export function attachTimelinePan(api: IApi, root: HTMLElement): () => void {
  let chart: HTMLElement | null = null;
  let disposed = false;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let observer: MutationObserver | null = null;

  let holding = false;
  let originX = 0;
  let originY = 0;
  let pointerX = 0;
  let pointerY = 0;
  let rafId = 0;

  const setCursor = (value: string | null) => {
    if (!chart) return;
    if (value == null) {
      chart.style.removeProperty('cursor');
      chart.querySelectorAll<HTMLElement>('.wx-area, .wx-scale').forEach(el => {
        el.style.removeProperty('cursor');
      });
      return;
    }
    chart.style.setProperty('cursor', value, 'important');
    chart.querySelectorAll<HTMLElement>('.wx-area, .wx-scale').forEach(el => {
      el.style.setProperty('cursor', value, 'important');
    });
  };

  const applyScroll = (left: number, top: number) => {
    const nextLeft = Math.max(0, left);
    const nextTop = Math.max(0, top);

    if (chart) {
      chart.scrollLeft = nextLeft;
      chart.scrollTop = nextTop;
    }

    const table = findTableScroll(root);
    if (table) {
      table.scrollTop = nextTop;
    }

    void api.exec('scroll-chart', { left: nextLeft, top: nextTop });
  };

  const tick = () => {
    if (!holding || !chart) return;

    const dx = pointerX - originX;
    const dy = pointerY - originY;
    setCursor(directionCursor(resolveDirection(dx, dy)));

    const vx = speedFromDelta(dx);
    const vy = speedFromDelta(dy);

    if (vx !== 0 || vy !== 0) {
      const top = api.getState().scrollTop ?? chart.scrollTop ?? 0;
      applyScroll(chart.scrollLeft + vx, top + vy);
    }

    rafId = window.requestAnimationFrame(tick);
  };

  const stopHold = () => {
    if (!holding) return;
    holding = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
    chart?.classList.remove('gantt-autoscroll');
    setCursor(null);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!holding) return;
    pointerX = event.clientX;
    pointerY = event.clientY;
  };

  const onPointerUp = (event: PointerEvent) => {
    if (event.button !== 1 && event.type === 'pointerup') return;
    stopHold();
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!chart) return;
    if (event.button !== 1) return;

    holding = true;
    originX = event.clientX;
    originY = event.clientY;
    pointerX = originX;
    pointerY = originY;

    chart.classList.add('gantt-autoscroll');
    setCursor('move');

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    rafId = window.requestAnimationFrame(tick);

    event.preventDefault();
    event.stopPropagation();
  };

  const onWheel = (event: WheelEvent) => {
    if (!chart || holding) return;
    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey;
    if (!horizontal) return;
    const delta = event.shiftKey ? event.deltaY : event.deltaX;
    if (delta === 0) return;
    applyScroll(chart.scrollLeft + delta, api.getState().scrollTop ?? 0);
    event.preventDefault();
  };

  const bind = (el: HTMLElement) => {
    chart = el;
    chart.classList.add('gantt-pan-enabled');
    chart.dataset.ganttPan = '1';
    setCursor(null);
    chart.addEventListener('pointerdown', onPointerDown, true);
    chart.addEventListener('wheel', onWheel, { passive: false });
    chart.addEventListener('auxclick', event => {
      if (event.button === 1) event.preventDefault();
    });
    chart.addEventListener('mousedown', event => {
      if (event.button === 1) event.preventDefault();
    });
  };

  const unbind = () => {
    stopHold();
    if (chart) {
      chart.removeEventListener('pointerdown', onPointerDown, true);
      chart.removeEventListener('wheel', onWheel);
      chart.classList.remove('gantt-pan-enabled', 'gantt-autoscroll');
      delete chart.dataset.ganttPan;
      setCursor(null);
    }
    chart = null;
  };

  const tryAttach = () => {
    if (disposed) return false;
    const el = findChart(root);
    if (!el) return false;
    if (chart === el) return true;
    unbind();
    bind(el);
    return true;
  };

  if (!tryAttach()) {
    observer = new MutationObserver(() => {
      if (tryAttach()) {
        observer?.disconnect();
        observer = null;
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    retryTimer = setTimeout(() => tryAttach(), 500);
  }

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    observer?.disconnect();
    unbind();
  };
}
