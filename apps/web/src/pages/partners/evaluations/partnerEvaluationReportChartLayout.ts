export type PartnerEvaluationReportChartLayout = 'responsive' | 'print';

export const PARTNER_EVALUATION_REPORT_PRINT_CHART = {
  /** Радар на всю ширину страницы (печать: одна колонка в row2). */
  radar: { width: 680, height: 280 },
  bar: { width: 680, height: 220 },
  /** Один критерий — одна строка. */
  line: { width: 680, height: 130 },
} as const;
