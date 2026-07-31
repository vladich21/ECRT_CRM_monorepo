import type { IApi, ITask } from '@svar-ui/react-gantt';
import { message } from 'antd';
import axios from 'axios';

import { ganttApi } from '../../../api/gantt/ganttApi';
import { isUuid, toIsoDate } from './ganttDates';
import { findAncestorByKind, getTaskStore, isGanttWorkTask } from './ganttTaskStore';
import { assertTaskDatesWithinStage } from './stageDateBounds';

type GanttTask = ITask & {
  entityKind?: string;
  deadline?: Date | null;
  laborHours?: number | null;
  responsibleUserId?: string | null;
  assigneeIds?: string[];
  status?: string;
  taskClass?: string | null;
  hourlyRate?: number | null;
  isAutoAuxiliary?: boolean;
};

function normalizeAssigneeIds(patch: Partial<GanttTask>): string[] | undefined {
  if (Array.isArray(patch.assigneeIds)) {
    return patch.assigneeIds.map(String).filter(Boolean);
  }
  return undefined;
}

function axiosErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message)) return data.message.join('; ');
  }
  return err instanceof Error ? err.message : 'Ошибка сохранения задачи';
}

/**
 * Только явно переданные поля — без затирания name/дат/часов соседними undefined.
 */
function buildUpdateBody(
  api: IApi,
  patch: Partial<GanttTask>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (patch.text !== undefined && patch.text !== null) {
    body.name = patch.text;
  }
  if (patch.start !== undefined) {
    const iso = toIsoDate(patch.start);
    if (iso) body.start_date = iso;
  }
  if (patch.end !== undefined) {
    const iso = toIsoDate(patch.end);
    if (iso) body.end_date = iso;
  }
  if (patch.deadline !== undefined) {
    body.deadline = toIsoDate(patch.deadline);
  }
  if (patch.laborHours !== undefined) {
    body.planned_hours = patch.laborHours;
  }
  if (patch.taskClass !== undefined) {
    body.task_class = patch.taskClass;
  }
  if (patch.hourlyRate !== undefined) {
    const raw = patch.hourlyRate as unknown;
    if (raw === null || raw === '' || raw === undefined) {
      body.hourly_rate = null;
    } else {
      const n = Number(raw);
      body.hourly_rate = Number.isFinite(n) ? n : null;
    }
  }
  if (patch.progress !== undefined) {
    body.progress = patch.progress;
  }
  if (patch.status !== undefined) {
    body.status = patch.status;
  }
  if (patch.responsibleUserId !== undefined) {
    body.responsible_user_id =
      patch.responsibleUserId === '' || patch.responsibleUserId == null
        ? null
        : patch.responsibleUserId;
  }
  const assigneeIds = normalizeAssigneeIds(patch);
  if (assigneeIds !== undefined) {
    body.assignee_ids = assigneeIds;
  }
  if (patch.parent !== undefined) {
    const parent =
      patch.parent != null ? getTaskStore(api).byId?.(patch.parent as string | number) : null;
    body.parent_id = parent?.entityKind === 'task' ? parent.id : null;
  }
  return body;
}

/**
 * Синхронизирует add/update/delete листовых задач и links с backend.
 * После мутации — `onChanged` (обычно refetch иерархии).
 */
export function attachApiTaskPersist(api: IApi, onChanged?: () => void): () => void {
  const tag = { tag: 'gantt-api-task-persist' };
  api.detach(tag.tag);

  let debounceTimer: number | null = null;
  const notify = () => {
    if (debounceTimer != null) window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      debounceTimer = null;
      onChanged?.();
    }, 150);
  };

  api.on(
    'add-task',
    (ev: {
      id?: string | number;
      task?: GanttTask;
      target?: string | number;
      inProgress?: boolean;
    }) => {
      if (ev?.inProgress || ev?.id == null) return;

      const created = getTaskStore(api).byId?.(ev.id) ?? ev.task;
      if (created && !isGanttWorkTask(created)) return;

      const stage =
        findAncestorByKind(api, ev.id, 'stage') ??
        (ev.target != null ? findAncestorByKind(api, ev.target, 'stage') : null);
      if (!stage?.id) return;

      const parent = getTaskStore(api).byId?.(created?.parent as string | number);
      const parentId = parent?.entityKind === 'task' ? String(parent.id) : null;

      const stageError = assertTaskDatesWithinStage(api, ev.id, {
        start: created?.start,
        end: created?.end,
      });
      if (stageError) {
        message.warning(stageError);
        notify();
        return;
      }

      void ganttApi
        .createTask({
          stage_id: String(stage.id),
          parent_id: parentId,
          name: created?.text || 'Новая задача',
          start_date: toIsoDate(created?.start),
          end_date: toIsoDate(created?.end),
          deadline: toIsoDate(created?.deadline) ?? toIsoDate((stage as GanttTask).deadline),
          planned_hours: created?.laborHours ?? 0,
          task_class: created?.taskClass ?? 'technical',
          progress: created?.progress ?? 0,
          status: created?.status ?? 'open',
          responsible_user_id: created?.responsibleUserId ?? null,
          assignee_ids: created?.assigneeIds ?? [],
        })
        .then(notify)
        .catch(err => {
          console.error('[gantt] createTask failed', err);
          message.error(axiosErrorMessage(err));
          notify();
        });
    },
    tag,
  );

  api.on(
    'update-task',
    (ev: { id?: string | number; task?: Partial<GanttTask>; inProgress?: boolean }) => {
      if (ev?.inProgress || ev?.id == null) return;
      const id = String(ev.id);
      if (!isUuid(id)) return;

      const current = getTaskStore(api).byId?.(ev.id);
      if (!current || current.entityKind !== 'task') return;

      const body = buildUpdateBody(api, ev.task ?? {});
      if (Object.keys(body).length === 0) return;

      if (body.start_date != null || body.end_date != null) {
        const stageError = assertTaskDatesWithinStage(api, ev.id, {
          start: (ev.task?.start as Date | undefined) ?? current.start,
          end: (ev.task?.end as Date | undefined) ?? current.end,
        });
        if (stageError) {
          message.warning(stageError);
          notify();
          return;
        }
      }

      void ganttApi.updateTask(id, body).then(notify).catch(err => {
        console.error('[gantt] updateTask failed', err);
        message.error(axiosErrorMessage(err));
        notify();
      });
    },
    tag,
  );

  api.on(
    'delete-task',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return;
      const id = String(ev.id);
      if (!isUuid(id)) return;
      const current = getTaskStore(api).byId?.(ev.id);
      if (current && current.entityKind !== 'task') return;
      void ganttApi.deleteTask(id).then(notify).catch(err => {
        console.error('[gantt] deleteTask failed', err);
        message.error(axiosErrorMessage(err));
        notify();
      });
    },
    tag,
  );

  api.on(
    'add-link',
    (ev: { link?: { source?: string | number; target?: string | number; type?: string } }) => {
      const { source, target, type } = ev?.link ?? {};
      if (source == null || target == null) return;
      if (!isUuid(String(source)) || !isUuid(String(target))) return;
      void ganttApi
        .createLink({ source: String(source), target: String(target), type: type ?? 'e2s' })
        .then(notify)
        .catch(err => {
          console.error('[gantt] createLink failed', err);
          message.error(axiosErrorMessage(err));
          notify();
        });
    },
    tag,
  );

  api.on(
    'delete-link',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return;
      const id = String(ev.id);
      if (!isUuid(id)) return;
      void ganttApi.deleteLink(id).then(notify).catch(err => {
        console.error('[gantt] deleteLink failed', err);
        message.error(axiosErrorMessage(err));
        notify();
      });
    },
    tag,
  );

  return () => {
    if (debounceTimer != null) window.clearTimeout(debounceTimer);
    api.detach(tag.tag);
  };
}
