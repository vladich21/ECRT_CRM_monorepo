import type { ModalFuncProps } from 'antd/es/modal/interface';
import { message } from 'antd';

import { projectApi } from '../../../api/projects/projectApi';
import type { GanttDateWarning } from '../../../types/gantt';
import { type GanttConfirmFn, runGanttConfirm } from './ganttConfirm';

/**
 * Предупреждения: сроки договора выходят за сроки проекта.
 * Предлагает расширить даты проекта.
 */
export function presentGanttDateWarnings(
  warnings: GanttDateWarning[],
  confirm: GanttConfirmFn,
  onApplied?: () => void,
): void {
  if (!warnings.length) return;

  const byProject = new Map<string, GanttDateWarning>();
  for (const warning of warnings) {
    const prev = byProject.get(warning.project_id);
    if (!prev) {
      byProject.set(warning.project_id, warning);
      continue;
    }
    const next = { ...prev };
    if (
      warning.suggested_project_start &&
      (!next.suggested_project_start || warning.suggested_project_start < next.suggested_project_start)
    ) {
      next.suggested_project_start = warning.suggested_project_start;
    }
    if (
      warning.suggested_project_end &&
      (!next.suggested_project_end || warning.suggested_project_end > next.suggested_project_end)
    ) {
      next.suggested_project_end = warning.suggested_project_end;
    }
    byProject.set(warning.project_id, next);
  }

  const list = [...byProject.values()];
  let index = 0;
  let applied = false;

  const showNext = () => {
    const warning = list[index];
    if (!warning) {
      if (applied) onApplied?.();
      return;
    }

    const projectLabel = warning.project_name ?? warning.project_id;
    const contractLabel = warning.contract_name ?? warning.contract_id;

    let settled = false;
    const advance = () => {
      if (settled) return;
      settled = true;
      index += 1;
      showNext();
    };

    runGanttConfirm(
      confirm,
      {
        title: 'Сроки договора выходят за сроки проекта',
        content: `Договор «${contractLabel}» (${warning.contract_start ?? '—'} – ${warning.contract_end ?? '—'}) не укладывается в проект «${projectLabel}» (${warning.project_start ?? '—'} – ${warning.project_end ?? '—'}). Изменить сроки проекта на ${warning.suggested_project_start ?? '—'} – ${warning.suggested_project_end ?? '—'}?`,
        okText: 'Изменить',
        cancelText: 'Отмена',
        onOk: async () => {
          try {
            await projectApi.editProject(warning.project_id, {
              ...(warning.suggested_project_start
                ? { start_date: warning.suggested_project_start }
                : {}),
              ...(warning.suggested_project_end ? { end_date: warning.suggested_project_end } : {}),
            });
            applied = true;
            message.success('Сроки проекта обновлены');
          } catch (err) {
            console.error('[gantt] editProject from date warning failed', err);
            message.error(err instanceof Error ? err.message : 'Не удалось изменить сроки проекта');
          } finally {
            advance();
          }
        },
        onCancel: advance,
        afterClose: advance,
      } satisfies ModalFuncProps,
      0,
    );
  };

  showNext();
}
