/** Структура изделий: дерево, элементы, ответственные. */

import { apiClient } from '../clients';
import { compactParams } from './swRegistryParams';
import type {
  CreateStructurePayload,
  SwStructureNode,
  SwStructurePatentLink,
} from '@/types/swRegistry';

export const swStructureApi = {
  getStructure: async (recordState = 'active'): Promise<SwStructureNode[]> => {
    const { data } = await apiClient.get<SwStructureNode[] | SwStructureNode>('/sw/structure', {
      params: compactParams({ recordState }),
    });
    return Array.isArray(data) ? data : [data];
  },

  createStructure: async (payload: CreateStructurePayload): Promise<SwStructureNode> => {
    const { data } = await apiClient.post<SwStructureNode>('/sw/structure', payload);
    return data;
  },

  updateStructure: async (id: string, payload: Partial<CreateStructurePayload>): Promise<SwStructureNode> => {
    const { data } = await apiClient.patch<SwStructureNode>(`/sw/structure/${id}`, payload);
    return data;
  },

  archiveStructure: async (id: string) => {
    const { data } = await apiClient.post(`/sw/structure/${id}/archive`);
    return data;
  },

  restoreStructure: async (id: string) => {
    const { data } = await apiClient.post(`/sw/structure/${id}/restore`);
    return data;
  },

  addResponsible: async (elementId: string, payload: { userId: string; roleCode: string }) => {
    const { data } = await apiClient.post(`/sw/structure/${elementId}/responsibles`, payload);
    return data;
  },

  removeResponsible: async (elementId: string, userId: string, roleCode: string) => {
    await apiClient.delete(`/sw/structure/${elementId}/responsibles/${userId}/${encodeURIComponent(roleCode)}`);
  },

  getStructurePatentLinks: async (elementId: string): Promise<SwStructurePatentLink[]> => {
    const { data } = await apiClient.get<SwStructurePatentLink[]>(`/sw/structure/detail/${elementId}/patents`);
    return data;
  },

  markStructureDeleted: async (id: string) => {
    const { data } = await apiClient.post(`/sw/structure/${id}/mark-deleted`);
    return data;
  },
};
