import type { ILink, ITask } from '@svar-ui/react-gantt';
import type * as XLSX from 'xlsx-js-style';

import { loadXlsxStyle } from '@/utils/loadXlsxStyle';

type XlsxModule = typeof import('xlsx-js-style');

const ENTITY_KIND_LABELS: Record<string, string> = {
  project: 'Проект',
  contract: 'Договор',
  stage: 'Этап',
  workPackage: 'Пакет работ',
  task: 'Задача',
};

const HEADER_STYLE: XLSX.CellStyle = {
  font: { bold: true, sz: 11 },
  fill: { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
};

const BORDER: XLSX.CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'D9D9D9' } },
  left: { style: 'thin', color: { rgb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
  right: { style: 'thin', color: { rgb: 'D9D9D9' } },
};

function formatDate(value: unknown): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  return value.toLocaleDateString('ru-RU');
}

function taskLevel(task: ITask, byId: Map<string, ITask>): number {
  let level = 0;
  let parentId = task.parent;
  let guard = 0;
  while (parentId != null && parentId !== 0 && parentId !== '0' && guard < 50) {
    level += 1;
    const parent = byId.get(String(parentId));
    if (!parent) break;
    parentId = parent.parent;
    guard += 1;
  }
  return level;
}

function entityLabel(task: ITask): string {
  const kind = typeof task.entityKind === 'string' ? task.entityKind : '';
  if (kind && ENTITY_KIND_LABELS[kind]) return ENTITY_KIND_LABELS[kind];
  if (task.type === 'summary') return 'Сводка';
  if (task.type === 'domain') return ENTITY_KIND_LABELS[kind] || 'Этап';
  if (task.type === 'milestone') return 'Веха';
  return 'Задача';
}

function isBranch(task: ITask): boolean {
  return (
    task.type === 'summary'
    || task.type === 'domain'
    || task.entityKind === 'project'
    || task.entityKind === 'contract'
    || task.entityKind === 'stage'
    || task.entityKind === 'workPackage'
  );
}

/** Отступ прямо в тексте «Название» (как в MS Project) — видно в любом Excel. */
const NAME_INDENT_UNIT = '\u00A0\u00A0\u00A0\u00A0'; // 4 NBSP ≈ один уровень

function formatNestedName(name: string, level: number): string {
  if (level <= 0) return name;
  return `${NAME_INDENT_UNIT.repeat(level)}${name}`;
}

/** Дерево в порядке обхода: родитель → дети (как на Gantt). */
function orderTasksTree(tasks: ITask[]): ITask[] {
  const byId = new Map(
    tasks.filter(task => task.id != null).map(task => [String(task.id), task]),
  );
  const children = new Map<string, ITask[]>();

  for (const task of tasks) {
    const parentKey = String(task.parent ?? 0);
    const list = children.get(parentKey) ?? [];
    list.push(task);
    children.set(parentKey, list);
  }

  const ordered: ITask[] = [];
  const visit = (parentKey: string) => {
    for (const child of children.get(parentKey) ?? []) {
      ordered.push(child);
      if (child.id != null) visit(String(child.id));
    }
  };
  visit('0');

  // на случай осиротевших узлов
  if (ordered.length < tasks.length) {
    for (const task of tasks) {
      if (!ordered.includes(task)) ordered.push(task);
    }
  }

  return ordered.length > 0 ? ordered : tasks;
}

type BuiltSheet = {
  aoa: (string | number)[][];
  levels: number[];
  branchFlags: boolean[];
};

function buildGanttSheet(tasks: ITask[]): BuiltSheet {
  const byId = new Map(
    tasks.filter(task => task.id != null).map(task => [String(task.id), task]),
  );
  const ordered = orderTasksTree(tasks);

  const headers = [
    'Название',
    'Тип',
    'Начало',
    'Окончание',
    'Длительность',
    'Прогресс %',
    'Дедлайн',
    'План (ч.)',
    'Факт (ч.)',
  ];

  const levels: number[] = [];
  const branchFlags: boolean[] = [];
  const rows = ordered.map(task => {
    const level = taskLevel(task, byId);
    levels.push(level);
    branchFlags.push(isBranch(task));
    const name = String(task.text ?? '').trim() || `ID ${task.id ?? ''}`;
    return [
      formatNestedName(name, level),
      entityLabel(task),
      formatDate(task.start),
      formatDate(task.end),
      task.duration ?? '',
      task.progress != null ? Math.round(Number(task.progress)) : '',
      formatDate(task.deadline),
      task.laborHours ?? '',
      task.actualHours ?? '',
    ];
  });

  return { aoa: [headers, ...rows], levels, branchFlags };
}

function buildLinksRows(tasks: ITask[], links: ILink[]): (string | number)[][] {
  const byId = new Map(
    tasks.filter(task => task.id != null).map(task => [String(task.id), task]),
  );

  const headers = ['ID', 'Источник', 'Приёмник', 'Тип'];
  const rows = links.map(link => {
    const source = byId.get(String(link.source));
    const target = byId.get(String(link.target));
    return [
      link.id ?? '',
      source?.text ? String(source.text) : String(link.source),
      target?.text ? String(target.text) : String(link.target),
      link.type,
    ];
  });

  return [headers, ...rows];
}

function styleHeaderRow(xlsx: XlsxModule, sheet: XLSX.WorkSheet, columnCount: number): void {
  for (let col = 0; col < columnCount; col += 1) {
    const address = xlsx.utils.encode_cell({ r: 0, c: col });
    const cell = sheet[address];
    if (!cell) continue;
    cell.s = HEADER_STYLE;
  }
}

function applyHierarchyStyles(
  xlsx: XlsxModule,
  sheet: XLSX.WorkSheet,
  levels: number[],
  branchFlags: boolean[],
): void {
  // Excel outline: слева появятся +/- для сворачивания дерева
  sheet['!rows'] = [{ hpt: 22 }];
  for (let i = 0; i < levels.length; i += 1) {
    const level = Math.min(7, Math.max(0, levels[i] ?? 0));
    sheet['!rows']![i + 1] = { level, hpt: 18 };
  }

  const maxLevel = levels.reduce((max, level) => Math.max(max, level), 0);
  if (maxLevel > 0) {
    // summary rows above children (как дерево Gantt)
    (sheet as XLSX.WorkSheet & { '!outline'?: { above?: boolean } })['!outline'] = {
      above: true,
    };
  }

  for (let rowIndex = 0; rowIndex < levels.length; rowIndex += 1) {
    const excelRow = rowIndex + 1;
    const branch = branchFlags[rowIndex] ?? false;

    for (let col = 0; col < 9; col += 1) {
      const address = xlsx.utils.encode_cell({ r: excelRow, c: col });
      const cell = sheet[address];
      if (!cell) continue;

      cell.s = {
        font: {
          sz: 11,
          bold: branch,
        },
        alignment: {
          vertical: 'center',
          // Тип, длительность, прогресс — по центру
          horizontal: col === 1 || col === 4 || col === 5 ? 'center' : 'left',
        },
        border: BORDER,
        ...(branch
          ? { fill: { patternType: 'solid' as const, fgColor: { rgb: 'FAFAFA' } } }
          : {}),
      };
    }
  }
}

/**
 * Выгрузка текущего дерева Gantt (+ лист связей) в xlsx.
 * Вложенность: отступ в тексте «Название» + Excel outline.
 */
export async function exportGanttToExcel(tasks: ITask[], links: ILink[]): Promise<void> {
  const xlsx = await loadXlsxStyle();
  const workbook = xlsx.utils.book_new();

  const { aoa, levels, branchFlags } = buildGanttSheet(tasks);
  const ganttSheet = xlsx.utils.aoa_to_sheet(aoa);
  styleHeaderRow(xlsx, ganttSheet, aoa[0]?.length ?? 0);
  applyHierarchyStyles(xlsx, ganttSheet, levels, branchFlags);
  ganttSheet['!cols'] = [
    { wch: 48 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
  ];
  xlsx.utils.book_append_sheet(workbook, ganttSheet, 'Гант');

  if (links.length > 0) {
    const linksAoa = buildLinksRows(tasks, links);
    const linksSheet = xlsx.utils.aoa_to_sheet(linksAoa);
    styleHeaderRow(xlsx, linksSheet, linksAoa[0]?.length ?? 0);
    linksSheet['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 40 }, { wch: 10 }];
    xlsx.utils.book_append_sheet(workbook, linksSheet, 'Связи');
  }

  const fileName = `gantt_${new Date().toISOString().slice(0, 10)}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
