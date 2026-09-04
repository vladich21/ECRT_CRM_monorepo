/**
 * Scroll только для реестров (list ↔ card).
 *
 * App                      → useScrollDetailPagesToTop()  карточка сверху (обязательно при manual scrollRestoration)
 * openFromRegistry()       — клик: сохранить scroll + navigate (без flushSync — иначе мигание списка)
 * useRegistryScroll()      — «Назад»: восстановить scroll после загрузки списка
 * useScrollToTopOnPageChange() — пагинация внутри вкладки
 */
import { useLayoutEffect, useRef } from 'react';
import { useLocation, type Location, type NavigateFunction, type NavigateOptions } from 'react-router-dom';

const STORAGE_KEY = 'srm-registry-scroll';

const REGISTRY_PATHS = new Set([
  '/partners',
  '/contracts',
  '/patents',
  '/projects',
  '/patent-grants',
  '/supplier-evaluations',
  '/sw/items',
]);

function isRegistryPath(pathname: string): boolean {
  if (REGISTRY_PATHS.has(pathname)) return true;
  return /^\/partners\/[^/]+\/contracts$/.test(pathname);
}

function routeKey(pathname: string, search = ''): string {
  return `${pathname}${search}`;
}

function ensureManualScrollRestoration(): void {
  if (typeof window !== 'undefined') {
    window.history.scrollRestoration = 'manual';
  }
}

function readSavedScroll(key: string): number {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const saved = (JSON.parse(raw) as Record<string, number>)[key];
    return typeof saved === 'number' && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function writeSavedScroll(key: string, scrollY: number): void {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const positions = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    positions[key] = Math.max(0, scrollY);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore quota / private mode
  }
}

function scrollTo(scrollY: number): void {
  window.scrollTo({ top: Math.max(0, scrollY), left: 0, behavior: 'instant' });
}

/** Карточки и формы — scroll 0 в layout effect, до paint (не в openFromRegistry — иначе мигание списка). */
export function useScrollDetailPagesToTop(): void {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    ensureManualScrollRestoration();
    if (!isRegistryPath(pathname)) {
      scrollTo(0);
    }
  }, [pathname, search]);
}

/** Клик в реестре: запомнить scroll списка и перейти в карточку. */
export function openFromRegistry(
  location: Pick<Location, 'pathname' | 'search'>,
  navigate: NavigateFunction,
  to: string,
  options?: NavigateOptions,
): void {
  if (isRegistryPath(location.pathname)) {
    ensureManualScrollRestoration();
    writeSavedScroll(routeKey(location.pathname, location.search), window.scrollY);
  }
  navigate(to, options);
}

/** «Назад» в реестр: восстановить scroll; при смене page пользователем — наверх. */
export function useRegistryScroll(options: { isListReady: boolean; page: number; restoreToken: number }): void {
  const { isListReady, page, restoreToken } = options;
  const { pathname, search } = useLocation();
  const prevPageRef = useRef(page);
  const prevRestoreTokenRef = useRef(restoreToken);
  const restoredForRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    ensureManualScrollRestoration();
    if (!isRegistryPath(pathname)) return;

    const key = routeKey(pathname, search);
    const pageChanged = page !== prevPageRef.current;
    const filtersRestored = restoreToken !== prevRestoreTokenRef.current;

    prevPageRef.current = page;
    prevRestoreTokenRef.current = restoreToken;

    if (pageChanged && !filtersRestored) {
      scrollTo(0);
      writeSavedScroll(key, 0);
      return;
    }

    if (!isListReady) return;

    const marker = `${key}:${restoreToken}`;
    if (restoredForRef.current === marker) return;

    const saved = readSavedScroll(key);
    if (saved > 0) {
      scrollTo(saved);
      restoredForRef.current = marker;
    }
  }, [pathname, search, isListReady, page, restoreToken]);
}

/** Пагинация внутри карточки — scroll наверх при смене page. */
export function useScrollToTopOnPageChange(page: number): void {
  const prevPageRef = useRef(page);

  useLayoutEffect(() => {
    if (page === prevPageRef.current) return;
    prevPageRef.current = page;
    scrollTo(0);
  }, [page]);
}
