import { Project } from '../../types/referenceTypes';
import { apiClient } from '../clients';

export type ProjectListTabParam =
  | 'all'
  | 'active'
  | 'completed'
  | 'pending'
  | 'paused'
  | 'cancelled';

export interface ProjectsListParams {
  search?: string;
  list_tab?: ProjectListTabParam;
  manager_id?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  /** set | empty — с сервера; «любые» не передаём */
  end_date_presence?: 'set' | 'empty';
}

export interface ProjectsListResponse {
  data: Project[];
  total: number;
  tab_counts: Record<ProjectListTabParam, number>;
}

export type ProjectPreviewItem = Pick<Project, 'id' | 'name' | 'code'>;

function compactParams(
  obj: Record<string, string | number | boolean | undefined>,
): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ''),
  ) as Record<string, string | number | boolean>;
}

export const projectApi = {
  /** Справочники: короткий список id / name / code */
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
      params: compactParams({ ...(params ?? {}), limit, offset }),
    });
    return response.data;
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
    return response.data;
  },
};
