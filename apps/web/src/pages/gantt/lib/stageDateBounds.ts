import type { IApi } from '@svar-ui/react-gantt';

import { formatDateRu, toIsoDate } from './ganttDates';
import { findStageForTask, getGanttTask } from './ganttTaskStore';

type StageBoundsTask = {
  entityKind?: string;
  deadline?: Date | string | null;
  boundStart?: Date | string | null;
  start?: Date | string | null;
  end?: Date | string | null;
  timelineStart?: Date | string | null;
  timelineEnd?: Date | string | null;
  isAutoAuxiliary?: boolean;
  text?: string;
};

export type StageDateViolation = {
  kind: 'start_before' | 'end_after' | 'start_after_end';
  taskStart?: Date | null;
  taskEnd?: Date | null;
  stageStart?: Date | null;
  stageEnd?: Date | null;
  stageName?: string;
};

function asDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Границы срока этапа: boundStart … deadline (шкала этапа, не rollup задач). */
export function getStageDeadlineBounds(
  api: IApi,
  taskId: string | number,
): { start: Date | null; end: Date | null; stageName?: string } | null {
  const stage = findStageForTask(api, taskId) as StageBoundsTask | null;
  if (!stage) return null;

  return {
    start:
      asDate(stage.boundStart) ??
      asDate(stage.timelineStart) ??
      asDate(stage.start),
    end:
      asDate(stage.deadline) ??
      asDate(stage.timelineEnd) ??
      asDate(stage.end),
    stageName: stage.text?.trim() || undefined,
  };
}

/** null = в пределах этапа. */
export function checkTaskDatesAgainstStage(
  api: IApi,
  taskId: string | number,
  next: { start?: Date | null; end?: Date | null },
): StageDateViolation | null {
  const current = getGanttTask(api, taskId);
  if (current?.isAutoAuxiliary) return null;

  const bounds = getStageDeadlineBounds(api, taskId);
  if (!bounds?.end && !bounds?.start) return null;

  const taskStart = next.start ?? null;
  const taskEnd = next.end ?? null;
  const startIso = toIsoDate(taskStart);
  const endIso = toIsoDate(taskEnd);
  const boundStartIso = toIsoDate(bounds.start);
  const boundEndIso = toIsoDate(bounds.end);

  const base = {
    taskStart,
    taskEnd,
    stageStart: bounds.start,
    stageEnd: bounds.end,
    stageName: bounds.stageName,
  };

  if (startIso && endIso && startIso > endIso) {
    return { kind: 'start_after_end', ...base };
  }
  if (startIso && boundStartIso && startIso < boundStartIso) {
    return { kind: 'start_before', ...base };
  }
  if (endIso && boundEndIso && endIso > boundEndIso) {
    return { kind: 'end_after', ...base };
  }
  return null;
}

/** null = в пределах этапа; иначе короткое описание (для FS auto-schedule). */
export function assertTaskDatesWithinStage(
  api: IApi,
  taskId: string | number,
  next: { start?: Date | null; end?: Date | null },
): string | null {
  const violation = checkTaskDatesAgainstStage(api, taskId, next);
  if (!violation) return null;

  if (violation.kind === 'end_after') {
    return `Окончание ${formatDateRu(violation.taskEnd)} позже срока этапа ${formatDateRu(violation.stageEnd)}.`;
  }
  if (violation.kind === 'start_before') {
    return `Начало ${formatDateRu(violation.taskStart)} раньше срока этапа ${formatDateRu(violation.stageStart)}.`;
  }
  return 'Начало задачи позже окончания.';
}

/** Задача уже выходит за срок этапа (без drag). */
export function isTaskBeyondStage(api: IApi, taskId: string | number): boolean {
  const task = getGanttTask(api, taskId);
  if (!task) return false;
  return checkTaskDatesAgainstStage(api, taskId, {
    start: task.start,
    end: task.end,
  }) != null;
}
