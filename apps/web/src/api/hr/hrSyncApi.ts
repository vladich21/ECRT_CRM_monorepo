import { apiClient } from '../clients';

export type HrSyncResponse = {
  created: number;
  updated: number;
  errors: string[];
  departments: { created: number; updated: number };
  positions: { created: number; updated: number };
};

export const hrSyncApi = {
  syncUsersNow: async (): Promise<HrSyncResponse> => {
    const res = await apiClient.post<HrSyncResponse>('/hr-sync/users/now', {});
    return res.data;
  },
};
