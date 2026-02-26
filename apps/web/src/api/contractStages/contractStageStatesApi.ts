import { ContractStageState } from '../../types/contract';
import { apiClient } from '../clients';

export const contractStageStateApi = {
  getContractStageStates: async (): Promise<ContractStageState[]> => {
    const response = await apiClient.get('/contract_states');
    return response.data;
  },

  getContractStageStateById: async (stateId: string): Promise<ContractStageState> => {
    const response = await apiClient.get(`/contract_states/${stateId}`);
    return response.data[0];
  },

  addContractStageState: async (data: Omit<ContractStageState, 'id'>): Promise<ContractStageState> => {
    const response = await apiClient.post('/contract_states', data);
    return response.data[0];
  },

  editContractStageState: async (stateId: string, data: Partial<ContractStageState>): Promise<ContractStageState> => {
    const response = await apiClient.put(`/contract_states/${stateId}`, data);
    return response.data[0];
  },

  deleteContractStageState: async (stateId: string): Promise<void> => {
    await apiClient.delete(`/contract_states/${stateId}`);
  },
};
