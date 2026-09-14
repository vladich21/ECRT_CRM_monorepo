import { apiClient } from '@/api/clients';

export type ViewerConfigResult = {
  documentServerUrl: string;
  config: Record<string, unknown>;
};

export const viewerApi = {
  /** Подписанный конфиг просмотра файла: DS заберёт документ сам, по ссылке внутри конфига. */
  getConfig: async (fileId: string): Promise<ViewerConfigResult> => {
    const { data } = await apiClient.get<ViewerConfigResult>(`/sw/viewer/config/${fileId}`);
    return data;
  },
};
