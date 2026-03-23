import { User } from '../../types/user';
import { apiClient } from '../clients';

export interface UsersListResponse {
  data: User[];
  total: number;
}

export const userApi = {
  getUsers: async (preview = 2, full = false): Promise<UsersListResponse> => {
    const params: Record<string, string> = {
      preview: String(preview),
      all: '1',
    };
    if (full) params.full = '1';
    const response = await apiClient.get<UsersListResponse>('/users', { params });
    return response.data;
  },
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data[0];
  },
  getUserByEmail: async (
    email: string,
  ): Promise<{
    id: string;
  } | null> => {
    if (!email?.trim()) return null;
    const response = await apiClient.get(`/users/by-email/${encodeURIComponent(email.trim())}`);
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
