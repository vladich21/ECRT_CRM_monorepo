import { Position } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const positionApi = {
  getPositions: async (preview?: number): Promise<Position[]> => {
    const response = await apiClient.get('/positions', {
      params: { preview },
    });
    return response.data;
  },
};
