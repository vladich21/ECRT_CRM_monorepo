import { User } from '../../types/user';
import { apiClient } from '../clients';

export const userApi = {
  getUsers: async (preview = 2, full = false): Promise<User[]> => {
    const params: Record<string, number | string> = { preview };
    if (full) params.full = '1';
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data[0];
  },

  getUserByLogin: async (login: string): Promise<{ id: string } | null> => {
    if (!login?.trim()) return null;
    const response = await apiClient.get(`/users/by-login/${encodeURIComponent(login.trim())}`);
    return response.data?.[0] ?? null;
  },

  addUser: async (data: User): Promise<User> => {
    const response = await apiClient.post('/users', data);
    return response.data[0];
  },

  editUser: async (userId: string, data: Partial<User>): Promise<User> => {
    const response = await apiClient.put(`/users/${userId}`, data);
    return response.data[0];
  },
};
