import type {
  RegistryExportColumn,
  RegistryExportExtraGroup,
  RegistryExportExtraSection,
} from './registryExportTypes';

export function getExportColumnHeader<TKey extends string>(column: RegistryExportColumn<TKey>): string {
  return column.exportLabel ?? column.label;
}

export function getDefaultExportColumnKeys<TKey extends string>(
  columns: RegistryExportColumn<TKey>[],
): TKey[] {
  return columns.filter(column => column.defaultSelected).map(column => column.key);
}

export function loadExportColumnKeys<TKey extends string>(
  columns: RegistryExportColumn<TKey>[],
  storageKey: string,
): TKey[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return getDefaultExportColumnKeys(columns);
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return getDefaultExportColumnKeys(columns);
    const allowed = new Set(columns.map(column => column.key));
    const keys = parsed.filter(
      (key): key is TKey => typeof key === 'string' && allowed.has(key as TKey),
    );
    return keys.length > 0 ? keys : getDefaultExportColumnKeys(columns);
  } catch {
    return getDefaultExportColumnKeys(columns);
  }
}

export function saveExportColumnKeys<TKey extends string>(storageKey: string, keys: TKey[]): void {
  localStorage.setItem(storageKey, JSON.stringify(keys));
}

export function getExportColumnsByKeys<TKey extends string>(
  columns: RegistryExportColumn<TKey>[],
  keys: TKey[],
): RegistryExportColumn<TKey>[] {
  const byKey = new Map(columns.map(column => [column.key, column]));
  return keys.map(key => byKey.get(key)).filter((column): column is RegistryExportColumn<TKey> => column != null);
}

export function getExportMainColumns<TKey extends string>(
  columns: RegistryExportColumn<TKey>[],
): RegistryExportColumn<TKey>[] {
  return columns.filter(column => column.defaultSelected);
}

export type RegistryExportExtraGroupWithColumns<TKey extends string = string> = Omit<
  RegistryExportExtraGroup<TKey>,
  'sections' | 'keys'
> & {
  columns: RegistryExportColumn<TKey>[];
  sections?: Array<RegistryExportExtraSection<TKey> & { columns: RegistryExportColumn<TKey>[] }>;
};

export function getExportExtraGroupsWithColumns<TKey extends string>(
  columns: RegistryExportColumn<TKey>[],
  groups: RegistryExportExtraGroup<TKey>[],
): RegistryExportExtraGroupWithColumns<TKey>[] {
  return groups
    .map(group => {
      if (group.sections?.length) {
        const sections = group.sections
          .map(section => ({
            ...section,
            columns: getExportColumnsByKeys(columns, section.keys),
          }))
          .filter(section => section.columns.length > 0);
        const sectionKeys = sections.flatMap(section => section.columns.map(column => column.key));

        return {
          id: group.id,
          title: group.title,
          column: group.column,
          columns: getExportColumnsByKeys(columns, sectionKeys),
          sections,
        };
      }

      return {
        id: group.id,
        title: group.title,
        column: group.column,
        columns: getExportColumnsByKeys(columns, group.keys ?? []),
      };
    })
    .filter(group => group.columns.length > 0);
}
