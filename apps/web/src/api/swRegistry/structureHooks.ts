/** Запросы структуры изделий. */

import { useMutation, useQuery } from '@tanstack/react-query';
import { swStructureApi } from './structure';
import type {
  CreateStructurePayload,
} from '@/types/swRegistry';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';
import { useInvalidateSwRegistry } from './commonHooks';

export function useSwStructure(recordState = 'active') {
  return useQuery({
    queryKey: swRegistryQueryKeys.structure(recordState),
    queryFn: () => swStructureApi.getStructure(recordState),
  });
}

export function useSwStructurePatentLinks(elementId: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.structurePatents(elementId ?? ''),
    queryFn: () => swStructureApi.getStructurePatentLinks(elementId!),
    enabled: Boolean(elementId),
  });
}

export function useCreateSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (payload: CreateStructurePayload) => swStructureApi.createStructure(payload),
    onSuccess: () => void invalidate(),
  });
}

export function useUpdateSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateStructurePayload> }) =>
      swStructureApi.updateStructure(id, payload),
    onSuccess: () => void invalidate(),
  });
}

export function useArchiveSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swStructureApi.archiveStructure(id),
    onSuccess: () => void invalidate(),
  });
}

export function useRestoreSwStructure() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swStructureApi.restoreStructure(id),
    onSuccess: () => void invalidate(),
  });
}

export function useMarkSwStructureDeleted() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: (id: string) => swStructureApi.markStructureDeleted(id),
    onSuccess: () => void invalidate(),
  });
}

export function useAddSwResponsible() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ elementId, userId, roleCode }: { elementId: string; userId: string; roleCode: string }) =>
      swStructureApi.addResponsible(elementId, { userId, roleCode }),
    onSuccess: () => void invalidate(),
  });
}

export function useRemoveSwResponsible() {
  const invalidate = useInvalidateSwRegistry();
  return useMutation({
    mutationFn: ({ elementId, userId, roleCode }: { elementId: string; userId: string; roleCode: string }) =>
      swStructureApi.removeResponsible(elementId, userId, roleCode),
    onSuccess: () => void invalidate(),
  });
}
