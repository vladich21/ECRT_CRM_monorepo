import { useCallback, useEffect, useState } from 'react';

export const PATENTS_LIST_SEARCH_DEBOUNCE_MS = 350;

export function usePatentsListSearchDebounce(searchQuery: string) {
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timerId = window.setTimeout(
      () => setDebouncedSearch(searchQuery),
      PATENTS_LIST_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timerId);
  }, [searchQuery]);
  const alignDebouncedWithQuery = useCallback((value: string) => {
    setDebouncedSearch(value);
  }, []);
  return { debouncedSearch, alignDebouncedWithQuery };
}
