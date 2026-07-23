import type { IApi, ITask } from '@svar-ui/react-gantt';

import { ganttApi } from '../../../api/gantt/ganttApi';
import { isUuid, toIsoDate } from './ganttDates';
import { findAncestorByKind, getTaskStore } from './ganttTaskStore';

type GanttTask = ITask & {
  entityKind?: string;
  laborHours?: number | null;
  responsibleUserId?: string | null;
  assigneeIds?: string[];
  status?: string;
};

function isLeafTask(task: GanttTask | undefined): task is GanttTask {
  return Boolean(task && task.entityKind === 'task');
}

function buildUpdateBody(
  api: IApi,
  patch: Partial<GanttTask>,
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if ('text' in patch) body.name = patch.text;
  if ('start' in patch) body.start_date = toIsoDate(patch.start);
  if ('end' in patch) body.end_date = toIsoDate(patch.end);
  if ('deadline' in patch) body.deadline = toIsoDate(patch.deadline);
  if ('laborHours' in patch) body.planned_hours = patch.laborHours;
  if ('progress' in patch) body.progress = patch.progress;
  if ('status' in patch) body.status = patch.status;
  if ('responsibleUserId' in patch) body.responsible_user_id = patch.responsibleUserId;
  if ('assigneeIds' in patch) body.assignee_ids = patch.assigneeIds;
  if ('parent' in patch) {
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
      // Контейнеры (project/contract/stage) не персистим; новые листы часто без entityKind.
      if (created?.entityKind && created.entityKind !== 'task') return;

      const stage =
        findAncestorByKind(api, ev.id, 'stage') ??
        (ev.target != null ? findAncestorByKind(api, ev.target, 'stage') : null);
      if (!stage?.id) return;

      const parent = getTaskStore(api).byId?.(created?.parent as string | number);
      const parentId = parent?.entityKind === 'task' ? String(parent.id) : null;

      void ganttApi
        .createTask({
          stage_id: String(stage.id),
          parent_id: parentId,
          name: created?.text || 'Новая задача',
          start_date: toIsoDate(created?.start),
          end_date: toIsoDate(created?.end),
          deadline: toIsoDate(created?.deadline),
          planned_hours: created?.laborHours ?? 0,
          progress: created?.progress ?? 0,
          status: created?.status ?? 'open',
          responsible_user_id: created?.responsibleUserId ?? null,
          assignee_ids: created?.assigneeIds ?? [],
        })
        .then(notify)
        .catch(notify);
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
      if (!isLeafTask(current)) return;

      const body = buildUpdateBody(api, ev.task ?? {});
      if (Object.keys(body).length === 0) return;

      void ganttApi.updateTask(id, body).then(notify).catch(notify);
    },
    tag,
  );

  api.on(
    'delete-task',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return;
      const id = String(ev.id);
      if (!isUuid(id)) return;
      void ganttApi.deleteTask(id).then(notify).catch(notify);
    },
    tag,
  );

  api.on(
    'add-link',
    (ev: { link?: { source?: string | number; target?: string | number; type?: string } }) => {
      const { source, target, type } = ev?.link ?? {};
      if (source == null || target == null) return;
      void ganttApi
        .createLink({ source: String(source), target: String(target), type: type ?? 'e2s' })
        .then(notify)
        .catch(notify);
    },
    tag,
  );

  api.on(
    'delete-link',
    (ev: { id?: string | number }) => {
      if (ev?.id == null) return;
      const id = String(ev.id);
      if (!isUuid(id)) return;
      void ganttApi.deleteLink(id).then(notify).catch(notify);
    },
    tag,
  );

  return () => {
    if (debounceTimer != null) window.clearTimeout(debounceTimer);
    api.detach(tag.tag);
  };
}
