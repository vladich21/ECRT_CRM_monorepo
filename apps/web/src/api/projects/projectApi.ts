import { EMPTY_DELETION_TAB_COUNTS, type DeletionScope, type DeletionTabCounts } from '../../constants/deletionScope';
import { Project } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export type ProjectListTabParam = 'all' | 'active' | 'completed' | 'pending' | 'paused' | 'cancelled';

export interface ProjectsListParams {
  search?: string;
  list_tab?: ProjectListTabParam;
  deleted_scope?: DeletionScope;
  manager_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  end_date_presence?: 'set' | 'empty';
}

export interface ProjectsListResponse {
  data: Project[];
  total: number;
  tab_counts: Record<ProjectListTabParam, number>;
  deletion_tab_counts: DeletionTabCounts;
}

export type ProjectPreviewItem = Pick<Project, 'id' | 'name' | 'code'>;
function compactParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')) as Record<
    string,
    string | number | boolean
  >;
}

export const projectApi = {
  getProjectsPreview: async (): Promise<ProjectPreviewItem[]> => {
    const response = await apiClient.get('/projects', {
      params: { preview: 1 },
    });
    return response.data;
  },
  getProjectsList: async (
    params?: ProjectsListParams,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ProjectsListResponse> => {
    const response = await apiClient.get('/projects', {
      params: compactParams({
        ...(params ?? {}),
        deleted_scope: params?.deleted_scope ?? 'active',
        limit,
        offset,
      }),
    });
    const body = response.data as ProjectsListResponse;
    return {
      ...body,
      deletion_tab_counts: body.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS,
    };
  },
  getProjectById: async (projectId: string): Promise<Project> => {
    const response = await apiClient.get(`/projects/${projectId}`);
    return response.data[0];
  },
  addProject: async (data: Project): Promise<Project> => {
    const response = await apiClient.post('/projects', data);
    return response.data[0];
  },
  editProject: async (projectId: string, data: Partial<Project>): Promise<Project> => {
    const response = await apiClient.put(`/projects/${projectId}`, data);
    return response.data[0];
  },
  deleteProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.delete(`/projects/${projectId}`);
    const body = response.data;
    return Array.isArray(body) ? body[0] : body;
  },
  restoreProject: async (projectId: string): Promise<Project> => {
    const response = await apiClient.put(`/projects/${projectId}/restore`);
    return response.data[0];
  },
};
