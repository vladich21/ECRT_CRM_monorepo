import { apiClient } from '../clients';
import type { User } from '../../types/user';

export const impersonationApi = {
  start: async (userId: string): Promise<{ user: User }> => {
    const res = await apiClient.post<{ user: User }>(`/admin/impersonate/${userId}`);
    return res.data;
  },

  stop: async (): Promise<{ user: User }> => {
    const res = await apiClient.post<{ user: User }>('/admin/stop-impersonation');
    return res.data;
  },
};
