// api/patentAreasApi.ts
import { PatentArea } from '../../types/patent';
import { apiClient } from '../clients';

export const patentAreasApi = {
  getPatentAreas: async (): Promise<PatentArea[]> => {
    const response = await apiClient.get('/patent_application_areas');
    return response.data;
  },

  getPatentAreaById: async (areaId: string): Promise<PatentArea> => {
    const response = await apiClient.get(`/patent_application_areas/${areaId}`);
    return response.data[0];
  },

  createPatentArea: async (data: PatentArea): Promise<PatentArea> => {
    const response = await apiClient.post('/patent_application_areas', data);
    return response.data[0];
  },

  updatePatentArea: async (areaId: string, data: Partial<PatentArea>): Promise<PatentArea> => {
    const response = await apiClient.put(`/patent_application_areas/${areaId}`, data);
    return response.data[0];
  },

  deletePatentArea: async (areaId: string): Promise<void> => {
    const response = await apiClient.delete(`/patent_application_areas/${areaId}`);
    return response.data;
  },
};
