import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const patentStatusesApi = {
  getPatentStatuses: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/patent-statuses');
    return response.data;
  },
};
