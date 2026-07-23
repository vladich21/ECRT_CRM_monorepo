/**
 * Zoom (Ctrl/⌘ + колёсико): кварталы → месяцы (дефолт) → месяц+дни.
 */
const QUARTER_LABELS = ['I кв.', 'II кв.', 'III кв.', 'IV кв.'] as const;

function formatQuarter(date: Date): string {
  return QUARTER_LABELS[Math.floor(date.getMonth() / 3)] ?? '';
}

export const GANTT_ZOOM_CONFIG = {
  level: 1,
  minCellWidth: 40,
  maxCellWidth: 120,
  levels: [
    {
      minCellWidth: 48,
      maxCellWidth: 90,
      scales: [
        { unit: 'year' as const, step: 1, format: '%Y' },
        { unit: 'month' as const, step: 3, format: formatQuarter },
      ],
    },
    {
      minCellWidth: 56,
      maxCellWidth: 110,
      scales: [
        { unit: 'year' as const, step: 1, format: '%Y' },
        { unit: 'month' as const, step: 1, format: '%F' },
      ],
    },
    {
      minCellWidth: 22,
      maxCellWidth: 40,
      scales: [
        { unit: 'month' as const, step: 1, format: '%F %Y' },
        { unit: 'day' as const, step: 1, format: '%j' },
      ],
    },
  ],
};

export const GANTT_MONTH_SCALES = [
  { unit: 'year' as const, step: 1, format: '%Y' },
  { unit: 'month' as const, step: 1, format: '%F' },
];

export const GANTT_MONTH_CELL_WIDTH = 80;
