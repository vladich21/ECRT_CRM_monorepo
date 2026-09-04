import { apiClient } from '../clients';
import type {
  AddSwItemPatentLinkPayload,
  ChangeSwDocumentStatusPayload,
  CreateStructurePayload,
  CreateSwDocumentPayload,
  CreateSwItemPayload,
  SwDocumentDetail,
  SwDocumentStatusesResponse,
  SwFileLinkResponse,
  SwItemDetail,
  SwItemListRow,
  SwItemPatentLink,
  SwItemsListResponse,
  SwRefItem,
  SwRegistryFile,
  SwStructureNode,
  SwStructurePatentLink,
  SwSummaryResponse,
  UpdateSwDocumentPayload,
  UpdateSwItemPayload,
} from '../../types/swRegistry';

function compactParams(obj: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''));
}

/** GET /api/sw/... — не короче 4 сегментов после /api (FilesController перехватывает ровно 3). */
export const swRegistryApi = {
  getStructure: async (recordState = 'active'): Promise<SwStructureNode[]> => {
    const { data } = await apiClient.get<SwStructureNode[] | SwStructureNode>('/sw/structure', {
      params: compactParams({ recordState }),
    });
    return Array.isArray(data) ? data : [data];
  },

  getReferences: async (kind: string): Promise<SwRefItem[]> => {
    const { data } = await apiClient.get<SwRefItem[]>(`/sw/references/kind/${kind}`);
    return data;
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

  createDocument: async (
    itemId: string,
    payload: CreateSwDocumentPayload,
  ): Promise<SwDocumentDetail & { warnings?: string[] }> => {
    const { data } = await apiClient.post(`/sw/items/detail/${itemId}/documents`, payload);
    return data;
  },

  getDocument: async (id: string): Promise<SwDocumentDetail> => {
    const { data } = await apiClient.get<SwDocumentDetail>(`/sw/documents/detail/${id}`);
    return data;
  },

  getDocumentStatuses: async (id: string): Promise<SwDocumentStatusesResponse> => {
    const { data } = await apiClient.get<SwDocumentStatusesResponse>(`/sw/documents/detail/${id}/statuses`);
    return data;
  },

  changeDocumentStatus: async (id: string, payload: ChangeSwDocumentStatusPayload) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/status`, payload);
    return data;
  },

  updateDocument: async (id: string, payload: UpdateSwDocumentPayload): Promise<SwDocumentDetail> => {
    const { data } = await apiClient.patch(`/sw/documents/detail/${id}`, payload);
    return data;
  },

  archiveDocument: async (id: string) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/archive`);
    return data;
  },

  restoreDocument: async (id: string) => {
    const { data } = await apiClient.post(`/sw/documents/detail/${id}/restore`);
    return data;
  },

  getSummary: async (params: {
    by?: string;
    elementId?: string;
    developmentKind?: string;
    partnerId?: string;
  }): Promise<SwSummaryResponse> => {
    const { data } = await apiClient.get<SwSummaryResponse>('/sw/summary', { params: compactParams(params) });
    return data;
  },

  markStructureDeleted: async (id: string) => {
    const { data } = await apiClient.post(`/sw/structure/${id}/mark-deleted`);
    return data;
  },

  markItemDeleted: async (id: string) => {
    const { data } = await apiClient.post(`/sw/items/detail/${id}/mark-deleted`);
    return data;
  },

  listFiles: async (objectType: string, objectId: string): Promise<SwRegistryFile[]> => {
    const { data } = await apiClient.get<SwRegistryFile[]>('/sw/files', {
      params: { objectType, objectId },
    });
    return data;
  },

  createSwFileTicket: async (payload: {
    objectType: string;
    objectId: string;
    purpose: string;
    filename: string;
    contentType?: string;
  }) => {
    const { data } = await apiClient.post<{
      fileId: string;
      versionId: string;
      version: number;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>('/sw/files/ticket', payload);
    return data;
  },

  createSwFileVersionTicket: async (
    fileId: string,
    payload: { filename?: string; contentType?: string },
  ) => {
    const { data } = await apiClient.post<{
      fileId: string;
      versionId: string;
      version: number;
      upload: { tusEndpoint: string; metadata: Record<string, string> };
    }>(`/sw/files/${fileId}/version-ticket`, payload);
    return data;
  },

  confirmSwFile: async (
    fileId: string,
    payload: {
      objectType: string;
      objectId: string;
      purpose: string;
      filename: string;
      versionId?: string;
    },
  ) => {
    const { data } = await apiClient.post(`/sw/files/${fileId}/confirm`, payload);
    return data;
  },

  getSwFileLink: async (fileId: string, version?: number): Promise<SwFileLinkResponse> => {
    const { data } = await apiClient.get<SwFileLinkResponse>(`/sw/files/${fileId}/link`, {
      params: version != null ? { version } : undefined,
    });
    return data;
  },

  detachSwFile: async (linkId: string) => {
    await apiClient.delete(`/sw/files/${linkId}`);
  },
};
