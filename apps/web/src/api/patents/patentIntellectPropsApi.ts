import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export const patentIntellectPropsApi = {
  getPatentIntellectProps: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/patent-intellectprops');
    return response.data;
  },
};
