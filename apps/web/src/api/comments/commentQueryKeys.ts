export const commentQueryKeys = {
  byEntity: (entityType: string, entityId: string | undefined) =>
    ['comments', entityType, entityId] as const,
  byId: (commentId: string) => ['comments', commentId] as const,
} as const;
