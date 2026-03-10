type SetLoadingScreenFn = (visible: boolean) => void;

let setLoadingScreenFn: SetLoadingScreenFn | null = null;
let navigateTimer: ReturnType<typeof setTimeout> | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function clearTimers() {
  if (navigateTimer) clearTimeout(navigateTimer);
  if (hideTimer) clearTimeout(hideTimer);
  navigateTimer = hideTimer = undefined;
}

export const authLoadingScreenStore = {
  registerSetState: (fn: SetLoadingScreenFn) => {
    setLoadingScreenFn = fn;
  },

  unregisterSetState: () => {
    setLoadingScreenFn = null;
  },

  show: () => {
    setLoadingScreenFn?.(true);
  },

  hide: () => {
    setLoadingScreenFn?.(false);
  },

  clearTimers,

  showThenNavigate(onNavigate: () => void, navigateAfterMs: number, hideAfterMs: number) {
    clearTimers();
    authLoadingScreenStore.show();
    navigateTimer = setTimeout(() => {
      onNavigate();
      navigateTimer = undefined;
    }, navigateAfterMs);
    hideTimer = setTimeout(() => {
      authLoadingScreenStore.hide();
      hideTimer = undefined;
    }, hideAfterMs);
  },
};
