/**
 * Включаемые MIT/custom возможности UI Ганта.
 * Только реальные kill-switch'и — без мёртвого roadmap.
 */
export const GANTT_UI = {
  /** Critical path (наш compute + CSS) */
  criticalPath: true,
  /** Excel export текущего дерева */
  excelExport: true,
  /** Подсветка выходных/праздников */
  workCalendarHighlight: true,
  /** Confirm при drag задачи на шкале */
  dateChangeConfirm: true,
} as const;
