import { ContractRevision } from '../../types/contract';
import { apiClient } from '../clients';

export const contractRevisionApi = {
  getContractRevisions: async (contractId: string): Promise<ContractRevision[]> => {
    const response = await apiClient.get(`/contract/${contractId}/revisions`);
    return response.data;
  },

  getContractRevisionById: async (contractId: string, revisionNumber: number): Promise<ContractRevision> => {
    const response = await apiClient.get(`/contract/${contractId}/revisions/${revisionNumber}`);
    return response.data;
  },

  createContractRevision: async (
    contractId: string,
    data: Omit<ContractRevision, 'contract_id' | 'revision_number'>,
  ): Promise<ContractRevision> => {
    const response = await apiClient.post(`/contract/${contractId}/revisions`, data);
    return response.data;
  },

  deleteContractRevision: async (contractId: string, revisionNumber: number): Promise<void> => {
    await apiClient.delete(`/contract/${contractId}/revisions/${revisionNumber}`);
  },
};
