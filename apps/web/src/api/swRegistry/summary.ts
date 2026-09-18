/** Свод по программам и документам. */

import { apiClient } from '../clients';
import { compactParams } from './swRegistryParams';
import type {
  SwSummaryResponse,
} from '@/types/swRegistry';

export const swSummaryApi = {
  getSummary: async (params: {
    by?: string;
    elementId?: string;
    developmentKind?: string;
    partnerId?: string;
  }): Promise<SwSummaryResponse> => {
    const { data } = await apiClient.get<SwSummaryResponse>('/sw/summary', { params: compactParams(params) });
    return data;
  },
};
