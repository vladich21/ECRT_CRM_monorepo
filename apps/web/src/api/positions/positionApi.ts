import { Position } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const positionApi = {
  getPositions: async (preview?: number): Promise<Position[]> => {
    const response = await apiClient.get('/positions', {
      params: { preview },
    });
    return response.data;
  },

  getPositionById: async (userId: string): Promise<Position> => {
    const response = await apiClient.get(`/positions/${userId}`);
    return response.data[0];
  },

  addPosition: async (data: Position): Promise<Position> => {
    const response = await apiClient.post('/positions', data);
    return response.data[0];
  },

  editPosition: async (userId: string, data: Partial<Position>): Promise<Position> => {
    const response = await apiClient.put(`/positions/${userId}`, data);
    return response.data[0];
  },

  deletePosition: async (userId: string): Promise<Position> => {
    const response = await apiClient.delete(`/positions/${userId}`);
    return response.data;
  },
};
