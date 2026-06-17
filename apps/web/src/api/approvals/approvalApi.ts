import type {
  ApprovalProcessView,
  ApprovalRouteListItem,
  ApprovalRouteRef,
  ApprovalStartInfo,
  DocumentApprovalState,
  MakeDecisionPayload,
  MyProcessItem,
  MyTaskItem,
  StartProcessPayload,
  TaskItem,
} from '../../types/approval';
import { apiClient } from '../clients';

export const approvalApi = {
  // ── Состояние/процессы ──
  getState: async (entityType: string, entityId: string): Promise<DocumentApprovalState> => {
    const res = await apiClient.get('/approvals/state', {
      params: { entity_type: entityType, entity_id: entityId },
    });
    return res.data;
  },

  getProcess: async (processId: string): Promise<ApprovalProcessView | null> => {
    const res = await apiClient.get(`/approvals/processes/${processId}`);
    return res.data;
  },

  start: async (payload: StartProcessPayload): Promise<{ id: string }> => {
    const res = await apiClient.post('/approvals/processes', payload);
    return res.data[0];
  },

  decision: async (processId: string, payload: MakeDecisionPayload): Promise<{ id: string }> => {
    const res = await apiClient.post(`/approvals/processes/${processId}/decision`, payload);
    return res.data[0];
  },

  /**
   * Повторная отправка после доработки. Multipart: comment + keepFileIds (id текущих
   * документов, переносимых в новую версию) + новые/заменяющие файлы версии N+1.
   */
  resubmit: async (
    processId: string,
    payload: { comment?: string; keepFileIds: string[]; files: File[] },
  ): Promise<{ id: string }> => {
    const fd = new FormData();
    if (payload.comment) fd.append('comment', payload.comment);
    fd.append('keepFileIds', JSON.stringify(payload.keepFileIds));
    payload.files.forEach((file, i) => fd.append(`file${i + 1}`, file));
    const res = await apiClient.post(`/approvals/processes/${processId}/resubmit`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data[0];
  },

  cancel: async (processId: string, comment?: string): Promise<{ id: string }> => {
    const res = await apiClient.delete(`/approvals/processes/${processId}`, { params: { comment } });
    return res.data;
  },

  // ── Инбоксы ──
  myTasks: async (): Promise<MyTaskItem[]> => (await apiClient.get('/approvals/my-tasks')).data,
  myTasksCount: async (): Promise<{ count: number }> =>
    (await apiClient.get('/approvals/my-tasks', { params: { count_only: 1 } })).data,
  myInitiated: async (): Promise<MyProcessItem[]> => (await apiClient.get('/approvals/my-initiated')).data,
  myParticipated: async (): Promise<MyProcessItem[]> => (await apiClient.get('/approvals/my-participated')).data,

  // ── Конструктор маршрутов (используется в F3 для start-info, в F4 для CRUD) ──
  getStartInfo: async (routeId: string): Promise<ApprovalStartInfo> =>
    (await apiClient.get(`/approvals/routes/${routeId}/start-info`)).data,

  availableRoutesByEntity: async (entityType: string): Promise<ApprovalRouteRef[]> =>
    (await apiClient.get('/approvals/routes', { params: { entity_type: entityType } })).data,

  listRoutes: async (entityType?: string): Promise<ApprovalRouteListItem[]> =>
    (await apiClient.get('/approvals/routes', { params: { entity_type: entityType } })).data,

  getRoute: async (routeId: string) => (await apiClient.get(`/approvals/routes/${routeId}`)).data,
  createRoute: async (data: Record<string, unknown>) => (await apiClient.post('/approvals/routes', data)).data[0],
  updateRoute: async (routeId: string, data: Record<string, unknown>) =>
    (await apiClient.put(`/approvals/routes/${routeId}`, data)).data[0],
  deleteRoute: async (routeId: string) => (await apiClient.delete(`/approvals/routes/${routeId}`)).data,
  replaceSteps: async (routeId: string, steps: unknown[]) =>
    (await apiClient.put(`/approvals/routes/${routeId}/steps`, { steps })).data,
  entityTypes: async () => (await apiClient.get('/approvals/references/entity-types')).data,
  stepRoles: async () => (await apiClient.get('/approvals/references/step-roles')).data,

  // ── Задачи-последствия (F5) ──
  tasksMy: async (): Promise<TaskItem[]> => (await apiClient.get('/approvals/tasks/my')).data,
  completeTask: async (taskId: string): Promise<{ id: string }> =>
    (await apiClient.post(`/approvals/tasks/${taskId}/complete`)).data[0],
};
