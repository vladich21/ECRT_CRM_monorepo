import { apiClient } from '../clients';
import type { GanttHierarchyResponse, GanttTaskDto } from '../../types/gantt';

export const ganttApi = {
  getHierarchy: () =>
    apiClient.get<GanttHierarchyResponse>('/gantt/hierarchy').then(r => r.data),

  listTasks: (params?: {
    user_id?: string;
    stage_id?: string;
    from?: string;
    to?: string;
    status?: string;
  }) =>
    apiClient
      .get<{ data: GanttTaskDto[] }>('/gantt/tasks', { params })
      .then(r => r.data),

  getTask: (id: string) =>
    apiClient.get<GanttTaskDto>(`/gantt/tasks/${id}`).then(r => r.data),

  createTask: (body: Record<string, unknown>) =>
    apiClient.post<GanttTaskDto>('/gantt/tasks', body).then(r => r.data),

  updateTask: (id: string, body: Record<string, unknown>) =>
    apiClient.put<GanttTaskDto>(`/gantt/tasks/${id}`, body).then(r => r.data),

  deleteTask: (id: string) =>
    apiClient.delete<{ ok: boolean }>(`/gantt/tasks/${id}`).then(r => r.data),

  createTimeEntry: (taskId: string, body: Record<string, unknown>) =>
    apiClient
      .post(`/gantt/tasks/${taskId}/time-entries`, body)
      .then(r => r.data),

  updateTimeEntry: (id: string, body: Record<string, unknown>) =>
    apiClient.put(`/gantt/time-entries/${id}`, body).then(r => r.data),

  deleteTimeEntry: (id: string) =>
    apiClient.delete(`/gantt/time-entries/${id}`).then(r => r.data),

  createLink: (body: { source: string; target: string; type?: string }) =>
    apiClient.post('/gantt/links', body).then(r => r.data),

  deleteLink: (id: string) =>
    apiClient.delete(`/gantt/links/${id}`).then(r => r.data),
};
