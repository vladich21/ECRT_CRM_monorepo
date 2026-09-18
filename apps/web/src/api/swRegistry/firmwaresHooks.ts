/** Запросы прошивок. */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { swFirmwaresApi } from './firmwares';
import type {
  CreateSwFirmwarePayload,
  CreateSwFirmwareVersionPayload,
} from '@/types/swRegistry';
import { swRegistryQueryKeys } from './swRegistryQueryKeys';

export function useSwFirmwares(itemId: string | undefined) {
  return useQuery({
    queryKey: swRegistryQueryKeys.firmwares(itemId ?? ''),
    queryFn: () => swFirmwaresApi.listFirmwares(itemId!),
    enabled: Boolean(itemId),
  });
}

/**
 * Все правки прошивок обновляют один список — список прошивок программы, поэтому
 * переменные у них одной формы: `itemId` (чей список перечитать) плюс само действие.
 */
function useFirmwareMutation<V extends { itemId: string }, R>(run: (variables: V) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: swRegistryQueryKeys.firmwares(variables.itemId) });
    },
  });
}

export function useCreateSwFirmware() {
  return useFirmwareMutation((payload: CreateSwFirmwarePayload) => swFirmwaresApi.createFirmware(payload));
}

export function useUpdateSwFirmware() {
  return useFirmwareMutation((v: { id: string; itemId: string; payload: { name?: string; note?: string | null } }) =>
    swFirmwaresApi.updateFirmware(v.id, v.payload),
  );
}

export function useCreateSwFirmwareVersion() {
  return useFirmwareMutation((v: { itemId: string; payload: CreateSwFirmwareVersionPayload }) =>
    swFirmwaresApi.createFirmwareVersion(v.payload),
  );
}

export function useDeleteSwFirmwareVersion() {
  return useFirmwareMutation((v: { itemId: string; versionId: string }) =>
    swFirmwaresApi.deleteFirmwareVersion(v.versionId),
  );
}

export function useDeleteSwFirmware() {
  return useFirmwareMutation((v: { itemId: string; id: string }) => swFirmwaresApi.deleteFirmware(v.id));
}
