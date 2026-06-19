import { useLayoutEffect, useRef, useState } from 'react';
import type { Location, NavigateFunction } from 'react-router-dom';

type NavigationStateRecord = Record<string, unknown>;

export type ListRestoredScrollState = {
  scrollY?: number;
};

export function useListReturnFromDetail<RestoredListState extends ListRestoredScrollState>(options: {
  location: Location;
  navigate: NavigateFunction;
  getRawSnapshot: (navigationState: NavigationStateRecord) => unknown;
  parse: (rawSnapshot: unknown) => RestoredListState | null;
  applyParsed: (restoredListState: RestoredListState) => void;
  applyFallback?: (navigationState: NavigationStateRecord) => void;
}): {
  pendingScrollY: number | undefined;
} {
  const [pendingScrollY, setPendingScrollY] = useState<number | undefined>();
  const getRawSnapshotRef = useRef(options.getRawSnapshot);
  const parseRef = useRef(options.parse);
  const applyParsedRef = useRef(options.applyParsed);
  const applyFallbackRef = useRef(options.applyFallback);
  getRawSnapshotRef.current = options.getRawSnapshot;
  parseRef.current = options.parse;
  applyParsedRef.current = options.applyParsed;
  applyFallbackRef.current = options.applyFallback;
  const { location, navigate } = options;

  useLayoutEffect(() => {
    const locationState = location.state;
    if (locationState == null || typeof locationState !== 'object') return;
    const navigationState = locationState as NavigationStateRecord;
    const rawSnapshot = getRawSnapshotRef.current(navigationState);
    const restoredListState = parseRef.current(rawSnapshot);
    if (restoredListState != null) {
      setPendingScrollY(restoredListState.scrollY);
      applyParsedRef.current(restoredListState);
      navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: {} });
      return;
    }
    applyFallbackRef.current?.(navigationState);
  }, [location.state, location.pathname, location.search, navigate]);

  return { pendingScrollY };
}
