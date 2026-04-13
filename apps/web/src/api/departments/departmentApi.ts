import { Department } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const departmentApi = {
  getDepartments: async (preview?: number): Promise<Department[]> => {
    const response = await apiClient.get('/departments', {
      params: { preview },
    });
    return response.data;
  },

  getDepartmentById: async (departmentId: string): Promise<Department> => {
    const response = await apiClient.get(`/departments/${departmentId}`);
    return response.data[0];
  },

  addDepartment: async (data: Pick<Department, 'name'>): Promise<Department> => {
    const response = await apiClient.post(`/departments`, data);
    return response.data[0];
  },

  editDepartment: async (departmentId: string, data: Partial<Department>): Promise<Department> => {
    const response = await apiClient.put(`/departments/${departmentId}`, data);
    return response.data[0];
  },

  deleteDepartment: async (departmentId: string): Promise<Department> => {
    const response = await apiClient.delete(`/departments/${departmentId}`);
    return response.data;
  },
};
