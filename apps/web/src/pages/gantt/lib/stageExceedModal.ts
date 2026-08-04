import { createElement } from 'react';
import type { IApi } from '@svar-ui/react-gantt';

import { type GanttConfirmFn, runGanttConfirm } from './ganttConfirm';
import { formatDateRu } from './ganttDates';
import {
  applyGanttTaskDates,
  snapshotTaskDates,
  type TaskDateSnapshot,
} from './ganttTaskDatePatch';
import { closeGanttEditor, getGanttTask } from './ganttTaskStore';
import { checkTaskDatesAgainstStage, type StageDateViolation } from './stageDateBounds';

function formatRange(snapshot: TaskDateSnapshot): string {
  return `${formatDateRu(snapshot.start)} – ${formatDateRu(snapshot.end)}`;
}

export function formatStageExceedModalText(
  taskLabel: string,
  before: TaskDateSnapshot,
  after: TaskDateSnapshot,
  violation: StageDateViolation,
): string {
  const stageTitle = violation.stageName?.trim() || 'Этап';

  const stageLine =
    violation.kind === 'end_after'
      ? `${stageTitle}\n  Срок окончания этапа: ${formatDateRu(violation.stageEnd)}`
      : violation.kind === 'start_before'
        ? `${stageTitle}\n  Начало этапа: ${formatDateRu(violation.stageStart)}`
        : 'Начало задачи позже её окончания.';

  return `Задача: ${taskLabel}

${stageLine}

Было: ${formatRange(before)}
Станет: ${formatRange(after)}

Оставить новые даты?`;
}

function datesChanged(before: TaskDateSnapshot, after: TaskDateSnapshot): boolean {
  return (
    before.start?.getTime() !== after.start?.getTime() ||
    before.end?.getTime() !== after.end?.getTime()
  );
}

/**
 * Домен + UI: если after выходит за этап — откат на before и модалка.
 * @returns true если показали модалку
 */
export function confirmStageExceedIfNeeded(
  api: IApi,
  taskId: string | number,
  before: TaskDateSnapshot,
  after: TaskDateSnapshot,
  confirm: GanttConfirmFn,
  modalOpen: { value: boolean },
): boolean {
  if (!datesChanged(before, after)) return false;

  const violation = checkTaskDatesAgainstStage(api, taskId, after);
  if (!violation) return false;
  if (modalOpen.value) return true;

  applyGanttTaskDates(api, taskId, before);
  modalOpen.value = true;
  closeGanttEditor(api);

  const label = getGanttTask(api, taskId)?.text?.trim() || `ID ${taskId}`;
  let settled = false;

  runGanttConfirm(confirm, {
    title: 'Даты задачи выходят за срок этапа',
    content: createElement(
      'div',
      { style: { whiteSpace: 'pre-line', lineHeight: 1.55 } },
      formatStageExceedModalText(label, before, after, violation),
    ),
    okText: 'Продолжить',
    cancelText: 'Отмена',
    onOk: () => {
      settled = true;
      applyGanttTaskDates(api, taskId, after);
      modalOpen.value = false;
    },
    onCancel: () => {
      settled = true;
      modalOpen.value = false;
    },
    afterClose: () => {
      if (!settled) modalOpen.value = false;
    },
  });

  return true;
}

/** Снимок дат задачи для сравнения «до / после». */
export function snapshotTaskDatesFromStore(
  api: IApi,
  taskId: string | number,
): TaskDateSnapshot {
  return snapshotTaskDates(getGanttTask(api, taskId));
}
