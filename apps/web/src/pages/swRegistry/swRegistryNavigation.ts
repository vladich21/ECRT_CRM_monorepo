import { isSafeInternalReturnPath } from '@/helpers/internalReturnNavigation';

export type SwRegistryReturnState = {
  from?: string;
};

export function buildSwRegistryReturnPath(pathname: string, search = ''): string {
  return `${pathname}${search}`;
}

/** Куда вести «Назад» со списка или верхнеуровневой страницы реестра ПО. */
export function resolveSwRegistryBackPath(options: {
  from?: string | null;
  hasSummaryDrill?: boolean;
  fallback?: string;
}): string {
  const { from, hasSummaryDrill, fallback = '/' } = options;
  if (from && isSafeInternalReturnPath(from)) return from;
  if (hasSummaryDrill) return '/sw/summary';
  return fallback;
}

export function readSwRegistryReturnState(state: unknown): SwRegistryReturnState {
  if (!state || typeof state !== 'object') return {};
  const s = state as SwRegistryReturnState;
  return { from: s.from };
}
