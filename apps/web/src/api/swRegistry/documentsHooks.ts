/** Запросы комплекта документации. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { swDocumentsApi } from './documents';
import type {
  ChangeSwDocumentStatusPayload,
  CreateSwDocumentPayload,
  UpdateSwDocumentPayload,
} from '@/types/swRegistry';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';
import { useInvalidateSwRegistry } from './commonHooks';

export function useCreateSwDocument() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: CreateSwDocumentPayload }) =>
      swDocumentsApi.createDocument(itemId, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useSwDocumentStatuses(documentId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: [...swRegistryQueryKeys.all, 'document-statuses', documentId],
    queryFn: () => swDocumentsApi.getDocumentStatuses(documentId!),
    enabled: Boolean(documentId) && enabled,
  });
}

export function useChangeSwDocumentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeSwDocumentStatusPayload }) =>
      swDocumentsApi.changeDocumentStatus(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(variables.id) });
    },
  });
}

export function useUpdateSwDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSwDocumentPayload }) =>
      swDocumentsApi.updateDocument(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(variables.id) });
    },
  });
}

export function useMarkSwDocumentDeleted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swDocumentsApi.markDocumentDeleted(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(id) });
    },
  });
}

export function useArchiveSwDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swDocumentsApi.archiveDocument(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(id) });
    },
  });
}

export function useRestoreSwDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swDocumentsApi.restoreDocument(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(id) });
    },
  });
}
