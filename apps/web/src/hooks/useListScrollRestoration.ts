import { useEffect, useRef } from 'react';

const LIST_SCROLL_STORAGE_PREFIX = 'srn.listScroll.';
const RESTORE_RETRY_DELAYS_MS = [0, 100, 250, 500, 800, 1200];

export function getListScrollY(): number {
  return window.scrollY;
}

export function restoreListScrollY(scrollY: number | undefined): boolean {
  if (scrollY == null || scrollY < 0) return false;
  window.scrollTo(0, scrollY);
  return Math.abs(window.scrollY - scrollY) <= 2;
}

export function readPersistedListScrollY(listKey: string): number | undefined {
  try {
    const raw = sessionStorage.getItem(`${LIST_SCROLL_STORAGE_PREFIX}${listKey}`);
    if (raw == null) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : undefined;
  } catch {
    return undefined;
  }
}

export function persistListScrollY(listKey: string, scrollY: number): void {
  try {
    sessionStorage.setItem(`${LIST_SCROLL_STORAGE_PREFIX}${listKey}`, String(scrollY));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Запоминает позицию прокрутки списка между переходами (sessionStorage). */
export function usePersistListScrollY(listKey: string): void {
  useEffect(() => {
    let timeoutId: number | undefined;

    const onScroll = () => {
      if (timeoutId != null) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        persistListScrollY(listKey, window.scrollY);
      }, 150);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [listKey]);
}

export function useListScrollRestoration(options: {
  pendingScrollY?: number;
  isListReady: boolean;
  /** Ключ списка (обычно location.pathname) — fallback, если нет snapshot в navigation state. */
  listKey?: string;
}): void {
  const restoredTargetRef = useRef<number | undefined>(undefined);
  const fallbackScrollY = options.listKey ? readPersistedListScrollY(options.listKey) : undefined;
  const targetScrollY = options.pendingScrollY ?? fallbackScrollY;

  useEffect(() => {
    if (!options.isListReady || targetScrollY == null) return;
    if (restoredTargetRef.current === targetScrollY) return;
    restoredTargetRef.current = targetScrollY;

    const timeouts: number[] = [];
    for (const delay of RESTORE_RETRY_DELAYS_MS) {
      const timeoutId = window.setTimeout(() => {
        restoreListScrollY(targetScrollY);
        if (options.listKey) persistListScrollY(options.listKey, targetScrollY);
      }, delay);
      timeouts.push(timeoutId);
    }

    return () => {
      for (const timeoutId of timeouts) window.clearTimeout(timeoutId);
    };
  }, [options.isListReady, targetScrollY, options.listKey]);
}

/**
 * При смене page пользователем - прокрутка наверх (новый список с начала).
 * После restore из карточки / sessionStorage - scroll не трогаем.
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
