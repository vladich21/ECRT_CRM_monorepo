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

/**
 * При смене page пользователем — прокрутка наверх (новый список с начала).
 * После restore из карточки / localStorage — scroll не трогаем (его восстанавливает useListScrollRestoration).
 */
export function useScrollToTopOnPageChange(page: number, restoreToken = 0): void {
  const prevPageRef = useRef(page);
  const prevRestoreTokenRef = useRef(restoreToken);

  useEffect(() => {
    const pageChanged = page !== prevPageRef.current;
    const restoreHappened = restoreToken !== prevRestoreTokenRef.current;

    prevPageRef.current = page;
    prevRestoreTokenRef.current = restoreToken;

    if (!pageChanged || restoreHappened) return;

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [page, restoreToken]);
}
