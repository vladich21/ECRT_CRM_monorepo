/** Программы: список, карточка, архив, связи с РИД. */

import { apiClient } from '../clients';
import { compactParams } from './swRegistryParams';
import type {
  AddSwItemPatentLinkPayload,
  CreateSwItemPayload,
  SwItemDetail,
  SwItemPatentLink,
  SwItemsListResponse,
  UpdateSwItemPayload,
} from '@/types/swRegistry';

export const swItemsApi = {
  getItems: async (params: {
    elementId?: string;
    developmentKind?: string;
    partnerId?: string;
    recordState?: string;
    documentStatus?: string;
    sheetStatus?: string;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<SwItemsListResponse> => {
    const { data } = await apiClient.get<SwItemsListResponse>('/sw/items', { params: compactParams(params) });
    return data;
  },

  getItem: async (id: string): Promise<SwItemDetail> => {
    const { data } = await apiClient.get<SwItemDetail>(`/sw/items/detail/${id}`);
    return data;
  },

  createItem: async (payload: CreateSwItemPayload): Promise<SwItemDetail & { warnings?: string[] }> => {
    const { data } = await apiClient.post('/sw/items', payload);
    return data;
  },

  updateItem: async (id: string, payload: UpdateSwItemPayload): Promise<SwItemDetail & { warnings?: string[] }> => {
    const { data } = await apiClient.patch(`/sw/items/detail/${id}`, payload);
    return data;
  },

  archiveItem: async (id: string) => {
    const { data } = await apiClient.post(`/sw/items/detail/${id}/archive`);
    return data;
  },

  restoreItem: async (id: string) => {
    const { data } = await apiClient.post(`/sw/items/detail/${id}/restore`);
    return data;
  },

  getItemPatentLinks: async (itemId: string): Promise<SwItemPatentLink[]> => {
    const { data } = await apiClient.get<SwItemPatentLink[]>(`/sw/items/detail/${itemId}/patents`);
    return data;
  },

  addItemPatentLink: async (itemId: string, payload: AddSwItemPatentLinkPayload) => {
    const { data } = await apiClient.post<{ link?: SwItemPatentLink; links: SwItemPatentLink[] }>(
      `/sw/items/detail/${itemId}/patents`,
      payload,
    );
    return data;
  },

  removeItemPatentLink: async (itemId: string, patentId: string) => {
    const { data } = await apiClient.delete(`/sw/items/detail/${itemId}/patents/${patentId}`);
    return data;
  },

  markItemDeleted: async (id: string) => {
    const { data } = await apiClient.post(`/sw/items/detail/${id}/mark-deleted`);
    return data;
  },
};
