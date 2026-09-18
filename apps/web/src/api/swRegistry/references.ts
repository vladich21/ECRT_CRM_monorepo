/** Справочники реестра: виды, статусы, применимость. */

import { apiClient } from '../clients';
import type {
  SwRefItem,
} from '@/types/swRegistry';

export const swReferencesApi = {
  getReferences: async (kind: string): Promise<SwRefItem[]> => {
    const { data } = await apiClient.get<SwRefItem[]>(`/sw/references/kind/${kind}`);
    return data;
  },
};
