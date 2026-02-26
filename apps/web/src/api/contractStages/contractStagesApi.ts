import { ContractStage } from '../../types/contract';
import { apiClient } from '../clients';

export const contractStageApi = {
  getContractStages: async (contractId?: string): Promise<ContractStage[]> => {
    if (!contractId) {
      const response = await apiClient.get('/stages');
      return response.data;
    }
    const response = await apiClient.get(`/contracts/${contractId}/stages`);
    return response.data;
  },

  getContractStageById: async (contractId: string, stageId: string): Promise<ContractStage> => {
    const response = await apiClient.get(`/contracts/${contractId}/stages/${stageId}`);
    return response.data[0];
  },

  addContractStage: async (contractId: string, data: ContractStage): Promise<ContractStage> => {
    const response = await apiClient.post(`/contracts/${contractId}/stages`, data);
    return response.data[0];
  },

  editContractStage: async (
    contractId: string,
    stageId: string,
    data: Partial<ContractStage>,
  ): Promise<ContractStage> => {
    const response = await apiClient.put(`/contracts/${contractId}/stages/${stageId}`, data);
    return response.data[0];
  },

  deleteContractStage: async (contractId: string, stageId: string): Promise<void> => {
    await apiClient.delete(`/contracts/${contractId}/stages/${stageId}`);
  },
};
