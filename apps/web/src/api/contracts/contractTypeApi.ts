import { ContractType } from '../../types/contract';
import { apiClient } from '../clients';

export const contractTypeApi = {
  getContractTypes: async (): Promise<ContractType[]> => {
    const response = await apiClient.get('/contract-types');
    return response.data;
  },

  getContractTypeById: async (typeId: string): Promise<ContractType> => {
    const response = await apiClient.get(`/contract-types/${typeId}`);
    return response.data;
  },

  createContractType: async (data: ContractType): Promise<ContractType> => {
    const response = await apiClient.post('/contract-types', data);
    return response.data;
  },

  updateContractType: async (typeId: string, data: Partial<ContractType>): Promise<ContractType> => {
    const response = await apiClient.patch(`/contract-types/${typeId}`, data);
    return response.data;
  },

  deleteContractType: async (typeId: string): Promise<void> => {
    const response = await apiClient.delete(`/contract-types/${typeId}`);
    return response.data;
  },
};
