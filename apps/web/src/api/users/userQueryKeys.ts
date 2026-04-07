export const userQueryKeys = {
  all: ['users'] as const,
  fullList: (preview: number, full: boolean) => [...userQueryKeys.all, 'full-list', preview, full] as const,
  detail: (userId: string) => [...userQueryKeys.all, userId] as const,
} as const;
