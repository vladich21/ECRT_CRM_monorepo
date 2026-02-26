import { Contract, ContractStage } from '../../types/contract';
import { Reference } from '../../types/referenceTypes';
import { apiClient } from '../clients';
import { ContractParams } from './contractApiHooks';

export const contractApi = {
  getContracts: async (params?: ContractParams): Promise<Contract[]> => {
    const response = await apiClient.get('/contracts', {
      params,
    });
    return response.data;
  },

  getContractsStates: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/contract_states');
    return response.data;
  },

  getContractsCategories: async (): Promise<Reference[]> => {
    const response = await apiClient.get('/contract_categories');
    return response.data;
  },

  getContractById: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.get(`/contracts/${contractId}`);
    return response.data[0];
  },

  addContract: async (data: Omit<Contract, 'id' | 'created_at' | 'updated_at'>): Promise<Contract> => {
    const response = await apiClient.post(`/contracts`, data);
    return response.data[0];
  },

  editContract: async (contractId: string, data: Partial<Contract>): Promise<Contract> => {
    const response = await apiClient.put(`/contracts/${contractId}`, data);
    return response.data[0];
  },

  deleteContract: async (contractId: string): Promise<Contract> => {
    const response = await apiClient.delete(`/contracts/${contractId}`);
    return response.data;
  },

  // Публичный доступ к договору по токену (без авторизации)
  getContractByPublicToken: async (token: string): Promise<Contract> => {
    const response = await apiClient.get(`/contracts/public/${token}`);
    return response.data;
  },

  // Получение этапов договора по публичному токену
  getContractStagesByPublicToken: async (token: string): Promise<ContractStage[]> => {
    const response = await apiClient.get(`/contracts/public/${token}/stages`);
    return response.data;
  },

  // Получение статусов этапов для публичного доступа
  getContractStageStatesPublic: async (): Promise<any[]> => {
    const response = await apiClient.get('/contract-stage-states/public');
    return response.data;
  },
};
