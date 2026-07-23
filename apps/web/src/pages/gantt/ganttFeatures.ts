/**
 * Карта фич Gantt: что уже на MIT, что запланировано (custom), что только PRO.
 * Не включает PRO-код — только флаги/документация для поэтапной реализации.
 */

export type GanttFeatureStatus = 'done' | 'mit-custom' | 'planned' | 'pro-only';

export type GanttFeatureFlag = {
  id: string;
  title: string;
  status: GanttFeatureStatus;
  note?: string;
};

/** Включаемые сейчас MIT/custom возможности UI. */
export const GANTT_UI = {
  /** Toolbar + ContextMenu + Editor (без колонки «+») */
  taskEditing: true,
  /** Линия «сегодня» (custom `_markers`) */
  todayMarker: true,
  /** По умолчанию всё свёрнуто; связи видны после раскрытия */
  openLinkedBranches: false,
  /** FS auto-schedule (наш `autoScheduleFs`, не PRO schedule) */
  fsAutoSchedule: true,
  /** Подсветка выходных/праздников */
  workCalendarHighlight: true,
  /** Persist open/closed в localStorage */
  treeOpenPersist: true,
  /** Persist tasks/links (add/edit/delete) в localStorage, пока нет API */
  chartPersist: true,
  /** Excel export текущего дерева */
  excelExport: true,
  /** Critical path (наш compute + CSS) */
  criticalPath: true,
  /** Confirm при смене дат (drag / Editor) */
  dateChangeConfirm: true,
} as const;

export const GANTT_FEATURE_ROADMAP: GanttFeatureFlag[] = [
  {
    id: 'customization',
    title: 'Easy customization (scales, bars, columns, editor)',
    status: 'done',
    note: 'scales/zoom, columns, Editor/Toolbar/ContextMenu',
  },
  {
    id: 'dnd-links',
    title: 'Interactive DnD + dependencies (links)',
    status: 'done',
    note: 'встроенный DnD SVAR + mock links e2s + FS schedule',
  },
  {
    id: 'add-task',
    title: 'Добавление задач',
    status: 'done',
    note: 'колонка add-task + Toolbar «Новая задача» + ContextMenu',
  },
  {
    id: 'today-marker',
    title: 'Линия «сегодня»',
    status: 'mit-custom',
    note: 'attachTodayMarker → _markers',
  },
  {
    id: 'excel-export',
    title: 'Export Excel',
    status: 'done',
    note: 'exportGanttToExcel + кнопка в GanttField',
  },
  {
    id: 'tree-persist',
    title: 'Persist open/closed in localStorage',
    status: 'mit-custom',
    note: 'srn.gantt.treeOpen.v1 + open-task',
  },
  {
    id: 'chart-persist',
    title: 'Persist tasks/links (add/edit) in localStorage',
    status: 'mit-custom',
    note: 'srn.gantt.chart.v1 пока USE_GANTT_MOCKS; потом API',
  },
  {
    id: 'critical-path',
    title: 'Critical path',
    status: 'mit-custom',
    note: 'computeCriticalPath + DOM highlight; PRO имеет встроенный',
  },
  {
    id: 'baselines',
    title: 'Baselines (plan vs actual)',
    status: 'pro-only',
  },
  {
    id: 'calendar-aware',
    title: 'Calendar-aware non-linear scale',
    status: 'pro-only',
    note: 'MIT: highlight + FS snap на рабочие дни',
  },
  {
    id: 'grouping',
    title: 'Task grouping',
    status: 'pro-only',
  },
  {
    id: 'resources',
    title: 'Resource planning & workload',
    status: 'pro-only',
    note: 'отдельный экран при необходимости',
  },
  {
    id: 'export-import',
    title: 'PDF/PNG/MS Project export-import',
    status: 'pro-only',
  },
  {
    id: 'split-tasks',
    title: 'Split tasks',
    status: 'pro-only',
  },
  {
    id: 'auto-schedule-pro',
    title: 'Built-in automatic scheduling (PRO)',
    status: 'pro-only',
    note: 'сейчас: autoScheduleFs на MIT',
  },
];
