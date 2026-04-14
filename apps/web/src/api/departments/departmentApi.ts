import { Department } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const departmentApi = {
  getDepartments: async (preview?: number): Promise<Department[]> => {
    const response = await apiClient.get('/departments', {
      params: { preview },
    });
    return response.data;
  },
};
