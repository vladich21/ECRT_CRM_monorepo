import { Project } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const projectApi = {
  getProjects: async (preview?: number): Promise<Project[]> => {
    const response = await apiClient.get('/projects', {
      params: { preview },
    });
    return response.data;
  },

  getProjectById: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data[0];
  },

  addProject: async (data: Project): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.data[0];
  },

  editProject: async (projectId: string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put(`/projects/${projectId}`, data);
    return response.data[0];
  },

  deleteProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    return response.data;
  },
};
