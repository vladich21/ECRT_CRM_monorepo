/** Значение `location.state.from`, если открыли документ из реестра `/patent-grants`. */
export const PATENT_GRANT_NAV_FROM_REGISTRY = 'registry';

/** Снимок списка реестра при уходе в карточку — восстанавливается по «Назад» (аналог `patentsListReturn`). */
export const PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY = 'patentGrantsRegistryReturn';

export type PatentGrantListNavState = {
  from?: string;
  /** JSON-снимок из `buildPatentGrantsRegistryListSnapshot`, см. `parsePatentGrantsRegistryListSnapshot`. */
  patentGrantsRegistryReturn?: unknown;
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
