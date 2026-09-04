import { isSafeInternalReturnPath } from '@/helpers/internalReturnNavigation';

export type SwRegistryReturnState = {
  from?: string;
  tab?: string;
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

/** Куда вести «Назад» с карточки программы. */
export function resolveSwItemDetailBackPath(options: {
  from?: string | null;
  hasSummaryDrill?: boolean;
  listSearch?: string;
}): string {
  const { from, hasSummaryDrill, listSearch = '' } = options;
  if (from && isSafeInternalReturnPath(from)) return from;
  if (hasSummaryDrill) return '/sw/summary';
  return `/sw/items${listSearch}`;
}

export function readSwRegistryReturnState(state: unknown): SwRegistryReturnState {
  if (!state || typeof state !== 'object') return {};
  const s = state as SwRegistryReturnState;
  return { from: s.from, tab: s.tab };
}
