import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';

import type {
  ApprovalProcessView,
  ApprovalStartInfo,
  DocumentApprovalState,
  MakeDecisionPayload,
  MyProcessItem,
  MyTaskItem,
  StartProcessPayload,
} from '../../types/approval';
import { approvalApi } from './approvalApi';
import { fileQueryKeys } from '../files/fileQueryKeys';
import { approvalQueryKeys, invalidateApprovalQueries } from './approvalQueryKeys';

// Согласование меняют другие пользователи → глобальный staleTime 30мин здесь вреден.
// Свежим должно быть всегда: refetch при фокусе/маунте + лёгкий поллинг панели.
const FRESH = { staleTime: 0, refetchOnWindowFocus: true, refetchOnMount: 'always' as const };

export const useApprovalState = (
  entityType: string,
  entityId?: string,
): UseQueryResult<DocumentApprovalState, Error> =>
  useQuery({
    queryKey: approvalQueryKeys.state(entityType, entityId),
    queryFn: () => approvalApi.getState(entityType, entityId!),
    enabled: !!entityType && !!entityId,
    ...FRESH,
    refetchInterval: 30_000, // живое обновление статуса, пока открыта вкладка
  });

export const useApprovalProcess = (processId?: string): UseQueryResult<ApprovalProcessView | null, Error> =>
  useQuery({
    queryKey: approvalQueryKeys.process(processId ?? ''),
    queryFn: () => approvalApi.getProcess(processId!),
    enabled: !!processId,
    ...FRESH,
  });

export const useApprovalStartInfo = (routeId?: string): UseQueryResult<ApprovalStartInfo, Error> =>
  useQuery({
    queryKey: approvalQueryKeys.startInfo(routeId ?? ''),
    queryFn: () => approvalApi.getStartInfo(routeId!),
    enabled: !!routeId,
  });

export const useMyTasks = (): UseQueryResult<MyTaskItem[], Error> =>
  useQuery({ queryKey: approvalQueryKeys.myTasks(), queryFn: approvalApi.myTasks, ...FRESH });

export const useMyTasksCount = (): UseQueryResult<{ count: number }, Error> =>
  useQuery({ queryKey: approvalQueryKeys.myTasksCount(), queryFn: approvalApi.myTasksCount, ...FRESH });

export const useMyInitiated = (): UseQueryResult<MyProcessItem[], Error> =>
  useQuery({ queryKey: approvalQueryKeys.myInitiated(), queryFn: approvalApi.myInitiated, ...FRESH });

export const useMyParticipated = (): UseQueryResult<MyProcessItem[], Error> =>
  useQuery({ queryKey: approvalQueryKeys.myParticipated(), queryFn: approvalApi.myParticipated, ...FRESH });

export const useStartProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StartProcessPayload) => approvalApi.start(payload),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

export const useMakeDecision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, payload }: { processId: string; payload: MakeDecisionPayload }) =>
      approvalApi.decision(processId, payload),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

export const useResubmitProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      processId,
      comment,
      keepFileIds,
      files,
    }: {
      processId: string;
      comment?: string;
      keepFileIds: string[];
      files: File[];
      entityType?: string;
      entityId?: string;
    }) => approvalApi.resubmit(processId, { comment, keepFileIds, files }),
    onSuccess: (_data, vars) => {
      void invalidateApprovalQueries(qc);
      // Документы версионируются - инвалидируем файлы сущности.
      if (vars.entityType && vars.entityId) {
        void qc.invalidateQueries({ queryKey: fileQueryKeys.byEntity(vars.entityType, vars.entityId) });
      }
    },
  });
};

export const useCancelProcess = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ processId, comment }: { processId: string; comment?: string }) =>
      approvalApi.cancel(processId, comment),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

// ── Конструктор маршрутов (F4) ──
export const useApprovalRoutesList = (entityType?: string) =>
  useQuery({
    queryKey: approvalQueryKeys.routes(entityType),
    queryFn: () => approvalApi.listRoutes(entityType),
  });

export const useApprovalRouteDetail = (routeId?: string) =>
  useQuery({
    queryKey: approvalQueryKeys.route(routeId ?? ''),
    queryFn: () => approvalApi.getRoute(routeId!),
    enabled: !!routeId,
  });

export const useApprovalEntityTypes = () =>
  useQuery({ queryKey: [...approvalQueryKeys.references(), 'entity-types'], queryFn: approvalApi.entityTypes });

export const useApprovalStepRoles = () =>
  useQuery({ queryKey: [...approvalQueryKeys.references(), 'step-roles'], queryFn: approvalApi.stepRoles });

export const useCreateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => approvalApi.createRoute(data),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

export const useUpdateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, data }: { routeId: string; data: Record<string, unknown> }) =>
      approvalApi.updateRoute(routeId, data),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

export const useDeleteRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (routeId: string) => approvalApi.deleteRoute(routeId),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

export const useReplaceRouteSteps = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ routeId, steps }: { routeId: string; steps: unknown[] }) =>
      approvalApi.replaceSteps(routeId, steps),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};

// ── Задачи-последствия (F5) ──
export const useMyTaskList = () =>
  useQuery({ queryKey: approvalQueryKeys.tasks(), queryFn: approvalApi.tasksMy, ...FRESH });

export const useCompleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => approvalApi.completeTask(taskId),
    onSuccess: () => void invalidateApprovalQueries(qc),
  });
};
