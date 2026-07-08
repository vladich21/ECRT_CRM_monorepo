import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

import { useRestoreToken } from '@/hooks/useServerTablePagination';

type NavigationStateRecord = Record<string, unknown>;

export type RegistryListUiHelpers = {
  /** listRestoreGeneration — не сбрасывать page/scroll после programmatic restore */
  bumpRestoreToken: () => void;
};

export type RegistryListUiStateOptions<TPersisted> = {
  location: Location;
  navigate: NavigateFunction;
  load: () => TPersisted | null;
  save: (snapshot: TPersisted) => void;
  getSnapshot: () => TPersisted;
  apply: (snapshot: TPersisted, helpers: RegistryListUiHelpers) => void;
  /** legacy hints: listTab, deletionScope, tab после delete/restore redirect */
  applyFallback?: (navigationState: NavigationStateRecord, helpers: RegistryListUiHelpers) => void;
  debounceMs?: number;
};

function hasNavigationHints(state: unknown): state is NavigationStateRecord {
  return state != null && typeof state === 'object' && !Array.isArray(state) && Object.keys(state).length > 0;
}

/**
 * UI реестра: localStorage (load on mount + debounced save) + restoreToken + optional navigation hints.
 * Scroll — отдельно в sessionStorage (`registryScroll.ts`).
 */
export function useRegistryListUiState<TPersisted>(options: RegistryListUiStateOptions<TPersisted>): {
  restoreToken: number;
  flushPersist: () => void;
} {
  const { location, navigate, load, save, getSnapshot, apply, applyFallback, debounceMs = 400 } = options;
  const [restoreToken, bumpRestoreToken] = useRestoreToken();
  const persistReadyRef = useRef(false);
  const applyRef = useRef(apply);
  const applyFallbackRef = useRef(applyFallback);
  const loadRef = useRef(load);
  applyRef.current = apply;
  applyFallbackRef.current = applyFallback;
  loadRef.current = load;

  const helpers: RegistryListUiHelpers = { bumpRestoreToken };

  useLayoutEffect(() => {
    const loaded = loadRef.current();
    if (loaded) {
      applyRef.current(loaded, helpers);
    }
    persistReadyRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only hydrate from localStorage
  }, []);

  useLayoutEffect(() => {
    if (!hasNavigationHints(location.state)) return;
    applyFallbackRef.current?.(location.state as NavigationStateRecord, helpers);
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
  }, [location.state, location.pathname, location.search, navigate]);

  const persistKey = JSON.stringify(getSnapshot());

  useEffect(() => {
    if (!persistReadyRef.current) return;
    const timeoutId = window.setTimeout(() => {
      save(getSnapshot());
    }, debounceMs);
    return () => window.clearTimeout(timeoutId);
  }, [persistKey, debounceMs, save, getSnapshot]);

  const flushPersist = () => {
    save(getSnapshot());
  };

  return { restoreToken, flushPersist };
}
