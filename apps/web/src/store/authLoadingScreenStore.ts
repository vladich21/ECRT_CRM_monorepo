type SetLoadingScreenFn = (visible: boolean) => void;

interface Timers {
  navigateTimer?: NodeJS.Timeout;
  hideTimer?: NodeJS.Timeout;
}

let setLoadingScreenFn: SetLoadingScreenFn | null = null;
const timers: Timers = {};

export const authLoadingScreenStore = {
  registerSetState: (fn: SetLoadingScreenFn): void => {
    setLoadingScreenFn = fn;
  },

  unregisterSetState: (): void => {
    setLoadingScreenFn = null;
  },

  show: (): void => {
    if (setLoadingScreenFn) {
      setLoadingScreenFn(true);
    }
  },

  hide: (): void => {
    if (setLoadingScreenFn) {
      setLoadingScreenFn(false);
    }
  },

  clearTimers: (): void => {
    if (timers.navigateTimer) {
      clearTimeout(timers.navigateTimer);
      timers.navigateTimer = undefined;
    }
    if (timers.hideTimer) {
      clearTimeout(timers.hideTimer);
      timers.hideTimer = undefined;
    }
  },

  setNavigateTimer: (callback: () => void, delay: number): void => {
    if (timers.navigateTimer) {
      clearTimeout(timers.navigateTimer);
    }
    timers.navigateTimer = setTimeout(() => {
      callback();
      timers.navigateTimer = undefined;
    }, delay);
  },

  setHideTimer: (callback: () => void, delay: number): void => {
    timers.hideTimer = setTimeout(() => {
      callback();
      timers.hideTimer = undefined;
    }, delay);
  },

  showThenNavigate(onNavigate: () => void, navigateAfterMs: number, hideAfterMs: number): void {
    this.clearTimers();
    this.show();
    this.setNavigateTimer(onNavigate, navigateAfterMs);
    this.setHideTimer(() => this.hide(), hideAfterMs);
  },
};
