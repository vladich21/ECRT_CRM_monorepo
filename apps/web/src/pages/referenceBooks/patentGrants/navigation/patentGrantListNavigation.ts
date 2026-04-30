/** Значение `location.state.from`, если открыли документ из реестра `/patent-grants`. */
export const PATENT_GRANT_NAV_FROM_REGISTRY = 'registry';

export type PatentGrantListNavState = {
  from?: string;
};

export function stateWithoutGrantNavFrom(state: unknown): Record<string, unknown> | undefined {
  if (state == null || typeof state !== 'object' || Array.isArray(state)) return undefined;
  const { from: _omit, ...rest } = state as Record<string, unknown>;
  return Object.keys(rest).length > 0 ? rest : undefined;
}

export function getPatentGrantListBackTarget(state: unknown): { path: string; label: string } {
  const from = (state as PatentGrantListNavState | null | undefined)?.from;
  if (from === PATENT_GRANT_NAV_FROM_REGISTRY || from === undefined || from === '') {
    return { path: '/patent-grants', label: 'Реестр охранных документов' };
  }
  return { path: `/patents/${from}/grants`, label: 'Охранные документы' };
}
