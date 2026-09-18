/** Запросы программ и их связей с РИД. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { swItemsApi } from './items';
import type {
  AddSwItemPatentLinkPayload,
  CreateSwItemPayload,
  UpdateSwItemPayload,
} from '@/types/swRegistry';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';
import { useInvalidateSwRegistry } from './commonHooks';

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
    queryFn: () => swItemsApi.getItems(params),
    enabled: options.enabled ?? true,
  });
}

export function useSwItem(id: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.item(id ?? ''),
    queryFn: () => swItemsApi.getItem(id!),
    enabled: Boolean(id),
  });
}

export function useSwItemPatentLinks(itemId: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.itemPatents(itemId ?? ''),
    queryFn: () => swItemsApi.getItemPatentLinks(itemId!),
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
      swItemsApi.addItemPatentLink(itemId, payload),
    onSuccess: (_data, variables) => invalidateItemPatentLinks(queryClient, variables.itemId),
  });
}

export function useRemoveSwItemPatentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patentId }: { itemId: string; patentId: string }) =>
      swItemsApi.removeItemPatentLink(itemId, patentId),
    onSuccess: (_data, variables) => invalidateItemPatentLinks(queryClient, variables.itemId),
  });
}

export function useCreateSwItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSwItemPayload) => swItemsApi.createItem(payload),
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
      swItemsApi.updateItem(id, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useArchiveSwItem() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swItemsApi.archiveItem(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreSwItem() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swItemsApi.restoreItem(id),
    onSuccess: () => void invalidate(),
  });
}

export function useMarkSwItemDeleted() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swItemsApi.markItemDeleted(id),
    onSuccess: () => void invalidate(),
  });
}
