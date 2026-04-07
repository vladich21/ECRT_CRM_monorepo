export const fileQueryKeys = {
  byEntity: (entityType: string, entityId: string) => ['files', entityType, entityId] as const,
} as const;
