import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { swRegistryApi } from './swRegistryApi';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';
import type {
  AddSwItemPatentLinkPayload,
  ChangeSwDocumentStatusPayload,
  CreateStructurePayload,
  CreateSwDocumentPayload,
  CreateSwItemPayload,
  SwFileObjectType,
  UpdateSwItemPayload,
  UpdateSwDocumentPayload,
} from '../../types/swRegistry';

export function useSwStructure(recordState = 'active') {
  return useQuery({
    queryKey: swRegistryQueryKeys.structure(recordState),
    queryFn: () => swRegistryApi.getStructure(recordState),
  });
}

export function useSwStructurePatentLinks(elementId: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.structurePatents(elementId ?? ''),
    queryFn: () => swRegistryApi.getStructurePatentLinks(elementId!),
    enabled: Boolean(elementId),
  });
}

export function useSwReferences(kind: string) {
  return useQuery({
    queryKey: swRegistryQueryKeys.references(kind),
    queryFn: () => swRegistryApi.getReferences(kind),
    // Справочники меняются редко, а от них зависит разметка комплекта: без кэша
    // каждое открытие программы ждало их заново.
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });
}

export function useSwItems(
  params: {
    elementId?: string;
    developmentKind?: string;
    partnerId?: string;
    recordState?: string;
    documentStatus?: string;
    sheetStatus?: string;
    q?: string;
    page?: number;
    limit?: number;
  },
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: swRegistryQueryKeys.items(params),
    queryFn: () => swRegistryApi.getItems(params),
    enabled: options.enabled ?? true,
  });
}

export function useSwItem(id: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.item(id ?? ''),
    queryFn: () => swRegistryApi.getItem(id!),
    enabled: Boolean(id),
  });
}

export function useSwItemPatentLinks(itemId: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.itemPatents(itemId ?? ''),
    queryFn: () => swRegistryApi.getItemPatentLinks(itemId!),
    enabled: Boolean(itemId),
  });
}

/**
 * После привязки или отвязки РИД обновляем всё, где связь видна: вкладку программы, её карточку и блок
 * «Связи с РИД» у элементов структуры. Кэш живёт 30 минут (main.jsx) — без сброса блок у элемента отставал.
 * У какого элемента и его предков связь показывается, фронт не знает, поэтому сбрасываем блоки всех элементов.
 */
function invalidateItemPatentLinks(queryClient: ReturnType<typeof useQueryClient>, itemId: string) {
  void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.itemPatents(itemId) });
  void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.item(itemId) });
  void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.structurePatentsAll() });
}

export function useAddSwItemPatentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: AddSwItemPatentLinkPayload }) =>
      swRegistryApi.addItemPatentLink(itemId, payload),
    onSuccess: (_data, variables) => invalidateItemPatentLinks(queryClient, variables.itemId),
  });
}

export function useRemoveSwItemPatentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patentId }: { itemId: string; patentId: string }) =>
      swRegistryApi.removeItemPatentLink(itemId, patentId),
    onSuccess: (_data, variables) => invalidateItemPatentLinks(queryClient, variables.itemId),
  });
}

export function useInvalidateSwRegistry() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
}

export function useCreateSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (payload: CreateStructurePayload) => swRegistryApi.createStructure(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateStructurePayload> }) =>
      swRegistryApi.updateStructure(id, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useArchiveSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.archiveStructure(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.restoreStructure(id),
    onSuccess: () => void invalidate(),
  });
}

export function useMarkSwStructureDeleted() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.markStructureDeleted(id),
    onSuccess: () => void invalidate(),
  });
}

export function useAddSwResponsible() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ elementId, userId, roleCode }: { elementId: string; userId: string; roleCode: string }) =>
      swRegistryApi.addResponsible(elementId, { userId, roleCode }),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveSwResponsible() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ elementId, userId, roleCode }: { elementId: string; userId: string; roleCode: string }) =>
      swRegistryApi.removeResponsible(elementId, userId, roleCode),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateSwItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSwItemPayload) => swRegistryApi.createItem(payload),
    onSuccess: async data => {
      queryClient.setQueryData(swRegistryQueryKeys.item(data.id), data);
      await queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
    },
  });
}

export function useUpdateSwItem() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSwItemPayload }) =>
      swRegistryApi.updateItem(id, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useArchiveSwItem() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.archiveItem(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreSwItem() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.restoreItem(id),
    onSuccess: () => void invalidate(),
  });
}

export function useMarkSwItemDeleted() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.markItemDeleted(id),
    onSuccess: () => void invalidate(),
  });
}

export function useCreateSwDocument() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: CreateSwDocumentPayload }) =>
      swRegistryApi.createDocument(itemId, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useSwDocumentStatuses(documentId: string | undefined, enabled = false) {
  return useQuery({
    queryKey: [...swRegistryQueryKeys.all, 'document-statuses', documentId],
    queryFn: () => swRegistryApi.getDocumentStatuses(documentId!),
    enabled: Boolean(documentId) && enabled,
  });
}

export function useChangeSwDocumentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangeSwDocumentStatusPayload }) =>
      swRegistryApi.changeDocumentStatus(id, payload),
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
      swRegistryApi.updateDocument(id, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(variables.id) });
    },
  });
}

export function useArchiveSwDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.archiveDocument(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(id) });
    },
  });
}

export function useRestoreSwDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swRegistryApi.restoreDocument(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.all });
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.document(id) });
    },
  });
}

export function useSwSummary(params: {
  by?: string;
  elementId?: string;
  developmentKind?: string;
  partnerId?: string;
}) {
  return useQuery({
    queryKey: swRegistryQueryKeys.summary(params),
    queryFn: () => swRegistryApi.getSummary(params),
  });
}

export function useSwFiles(objectType: SwFileObjectType, objectId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: swRegistryQueryKeys.files(objectType, objectId ?? ''),
    queryFn: () => swRegistryApi.listFiles(objectType, objectId!),
    enabled: Boolean(objectId) && enabled,
  });
}

export function useDetachSwFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ linkId }: { linkId: string; objectType: string; objectId: string }) =>
      swRegistryApi.detachSwFile(linkId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: swRegistryQueryKeys.files(variables.objectType, variables.objectId),
      });
    },
  });
}
