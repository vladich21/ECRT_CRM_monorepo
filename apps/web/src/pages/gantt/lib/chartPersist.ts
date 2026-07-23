import type { IApi, ILink, ITask } from '@svar-ui/react-gantt';

import { linksFromApi } from './ganttApi';

const STORAGE_KEY = 'srn.gantt.chart.v1';
const VERSION = 1;

type ChartSnapshot = {
  version: number;
  tasks: ITask[];
  links: ILink[];
};

function reviveDate(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function reviveTask(raw: ITask): ITask {
  const start = reviveDate(raw.start);
  const end = reviveDate(raw.end);
  const deadline = reviveDate(raw.deadline as unknown);
  return {
    ...raw,
    ...(start ? { start } : {}),
    ...(end ? { end } : {}),
    ...(deadline ? { deadline } : { deadline: raw.deadline ?? null }),
  };
}

/** Загружает сохранённый снимок диаграммы (после add/edit), иначе null. */
export function loadChartSnapshot(): { tasks: ITask[]; links: ILink[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChartSnapshot;
    if (!parsed || parsed.version !== VERSION) return null;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.links)) return null;
    if (parsed.tasks.length === 0) return null;
    return {
      tasks: parsed.tasks.map(reviveTask),
      links: parsed.links,
    };
  } catch {
    return null;
  }
}

export function saveChartSnapshot(tasks: ITask[], links: ILink[]): void {
  try {
    const snapshot: ChartSnapshot = { version: VERSION, tasks, links };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearChartSnapshot(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const PERSIST_EVENTS = [
  'add-task',
  'update-task',
  'delete-task',
  'copy-task',
  'move-task',
  'indent-task',
  'paste-task',
  'add-link',
  'update-link',
  'delete-link',
] as const;

/**
 * Пишет serialize()+links в localStorage (debounce).
 * Типы/entityKind на add — в attachTaskTypeSync.
 */
export function attachChartPersist(
  api: IApi,
  linksFallback: () => ILink[],
): () => void {
  const tag = { tag: 'gantt-chart-persist' };
  api.detach(tag.tag);

  let timer: number | null = null;

  const flush = () => {
    timer = null;
    try {
      const tasks = api.serialize();
      const links = linksFromApi(api, linksFallback());
      saveChartSnapshot(tasks, links);
    } catch {
      /* ignore */
    }
  };

  const schedule = (ev?: { inProgress?: boolean }) => {
    if (ev?.inProgress) return;
    if (timer != null) window.clearTimeout(timer);
    timer = window.setTimeout(flush, 200);
  };

  for (const event of PERSIST_EVENTS) {
    api.on(event, schedule, tag);
  }

  return () => {
    if (timer != null) window.clearTimeout(timer);
    api.detach(tag.tag);
  };
}
