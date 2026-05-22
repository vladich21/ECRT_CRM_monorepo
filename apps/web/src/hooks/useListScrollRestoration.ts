import { useEffect, useRef } from 'react';

export function getListScrollY(): number {
  return window.scrollY;
}

export function restoreListScrollY(scrollY: number | undefined): boolean {
  if (scrollY == null || scrollY < 0) return false;
  window.scrollTo(0, scrollY);
  return Math.abs(window.scrollY - scrollY) <= 2;
}

const MAX_SCROLL_RESTORE_ATTEMPTS = 10;

export function useListScrollRestoration(options: {
  pendingScrollY: number | undefined;
  isListReady: boolean;
}): void {
  const restoredTargetRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!options.isListReady || options.pendingScrollY == null) return;
    if (restoredTargetRef.current === options.pendingScrollY) return;
    restoredTargetRef.current = options.pendingScrollY;

    let attempts = 0;
    const tryRestore = () => {
      const ok = restoreListScrollY(options.pendingScrollY);
      attempts += 1;
      if (!ok && attempts < MAX_SCROLL_RESTORE_ATTEMPTS) {
        requestAnimationFrame(tryRestore);
      }
    };

    requestAnimationFrame(tryRestore);
  }, [options.isListReady, options.pendingScrollY]);
}
