import { useCallback, useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs: number): readonly [T, (immediate: T) => void] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timerId = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timerId);
  }, [value, delayMs]);
  const flush = useCallback((immediate: T) => setDebounced(immediate), []);
  return [debounced, flush] as const;
}
