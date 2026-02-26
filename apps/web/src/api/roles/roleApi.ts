import { Role } from '../../types/user';
import { apiClient } from '../clients';

export const roleApi = {
  getRoles: async (): Promise<Role[]> => {
    const response = await apiClient.get('/roles?preview=1');
    return response.data;
  },

  getRoleById: async (userId: string): Promise<Role> => {
    const response = await apiClient.get(`/roles/${userId}`);
    return response.data[0];
  },

  addRole: async (data: Role): Promise<Role> => {
    const response = await apiClient.post('/roles', data);
    return response.data[0];
  },

  editRole: async (userId: string, data: Partial<Role>): Promise<Role> => {
    const response = await apiClient.put(`/roles/${userId}`, data);
    return response.data[0];
  },

  deleteRole: async (userId: string): Promise<void> => {
    await apiClient.delete(`/roles/${userId}`);
  },
};
