import type { ModalFuncProps } from 'antd/es/modal/interface';

import { projectApi } from '../../../api/projects/projectApi';
import type { GanttDateWarning } from '../../../types/gantt';

type ConfirmFn = (props: ModalFuncProps) => void;

/**
 * Показывает предупреждения: сроки договора выходят за сроки проекта.
 * Предлагает расширить даты проекта.
 */
export function presentGanttDateWarnings(
  warnings: GanttDateWarning[],
  confirm: ConfirmFn,
  onApplied?: () => void,
): void {
  if (!warnings.length) return;

  // Одна модалка на уникальный project_id с самым широким suggested range
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

  const showNext = () => {
    const warning = list[index];
    if (!warning) {
      onApplied?.();
      return;
    }

    const projectLabel = warning.project_name ?? warning.project_id;
    const contractLabel = warning.contract_name ?? warning.contract_id;

    window.setTimeout(() => {
      confirm({
        title: 'Сроки договора выходят за сроки проекта',
        content: `Договор «${contractLabel}» (${warning.contract_start ?? '—'} – ${warning.contract_end ?? '—'}) не укладывается в проект «${projectLabel}» (${warning.project_start ?? '—'} – ${warning.project_end ?? '—'}). Изменить сроки проекта на ${warning.suggested_project_start ?? '—'} – ${warning.suggested_project_end ?? '—'}?`,
        okText: 'Изменить сроки проекта',
        cancelText: 'Оставить как есть',
        centered: true,
        zIndex: 11000,
        getContainer: () => document.body,
        onOk: async () => {
          await projectApi.editProject(warning.project_id, {
            start_date: warning.suggested_project_start ?? undefined,
            end_date: warning.suggested_project_end ?? undefined,
          });
          index += 1;
          showNext();
        },
        onCancel: () => {
          index += 1;
          showNext();
        },
      });
    }, 0);
  };

  showNext();
}
