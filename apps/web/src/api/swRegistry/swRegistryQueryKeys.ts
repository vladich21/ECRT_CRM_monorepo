export const swRegistryQueryKeys = {
  all: ['sw'] as const,
  structure: (recordState: string) => [...swRegistryQueryKeys.all, 'structure', recordState] as const,
  structurePatents: (elementId: string) => [...swRegistryQueryKeys.all, 'structure-patents', elementId] as const,
  /** Связи с РИД у всех элементов структуры: сброс после привязки или отвязки РИД у программы. */
  structurePatentsAll: () => [...swRegistryQueryKeys.all, 'structure-patents'] as const,
  references: (kind: string) => [...swRegistryQueryKeys.all, 'references', kind] as const,
  items: (params: Record<string, string | number | undefined>) =>
    [...swRegistryQueryKeys.all, 'items', params] as const,
  item: (id: string) => [...swRegistryQueryKeys.all, 'item', id] as const,
  itemPatents: (id: string) => [...swRegistryQueryKeys.all, 'item-patents', id] as const,
  document: (id: string) => [...swRegistryQueryKeys.all, 'document', id] as const,
  summary: (params: Record<string, string | undefined>) => [...swRegistryQueryKeys.all, 'summary', params] as const,
  files: (objectType: string, objectId: string) =>
    [...swRegistryQueryKeys.all, 'files', objectType, objectId] as const,
};
