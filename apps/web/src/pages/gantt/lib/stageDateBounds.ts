import type { IApi, ITask } from '@svar-ui/react-gantt';

import { formatDateRu, toIsoDate } from './ganttDates';
import { findAncestorByKind } from './ganttTaskStore';

type StageBoundsTask = ITask & {
  entityKind?: string;
  deadline?: Date | null;
  boundStart?: Date | null;
};

/**
 * Границы «Срока» этапа для валидации задач.
 * Нижняя — planned start (boundStart), верхняя — deadline (planned end из карточки).
 * Не используем start/end этапа: на шкале это «Окончание» (rollup задач).
 */
export function getStageDeadlineBounds(
  api: IApi,
  taskId: string | number,
): { start: Date | null; end: Date | null } | null {
  const stage = findAncestorByKind(api, taskId, 'stage') as StageBoundsTask | null;
  if (!stage) return null;
  return {
    start: stage.boundStart instanceof Date ? stage.boundStart : null,
    end: stage.deadline instanceof Date ? stage.deadline : null,
  };
}

/** null = ок; иначе текст ошибки (как на backend assertDatesWithinStage). */
export function assertTaskDatesWithinStage(
  api: IApi,
  taskId: string | number,
  next: { start?: Date | null; end?: Date | null },
): string | null {
  const bounds = getStageDeadlineBounds(api, taskId);
  if (!bounds) return null;
  if (!bounds.start && !bounds.end) return null;

  const startIso = toIsoDate(next.start);
  const endIso = toIsoDate(next.end);
  const boundStartIso = toIsoDate(bounds.start);
  const boundEndIso = toIsoDate(bounds.end);

  if (startIso && boundStartIso && startIso < boundStartIso) {
    return `Начало (${formatDateRu(next.start)}) раньше срока этапа (${formatDateRu(bounds.start)})`;
  }
  if (endIso && boundEndIso && endIso > boundEndIso) {
    return `Окончание (${formatDateRu(next.end)}) позже срока этапа (${formatDateRu(bounds.end)})`;
  }
  if (startIso && endIso && startIso > endIso) {
    return 'Начало задачи позже окончания';
  }
  return null;
}
