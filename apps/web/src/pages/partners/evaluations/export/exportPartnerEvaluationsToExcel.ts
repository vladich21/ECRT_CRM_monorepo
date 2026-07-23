import type * as XLSX from 'xlsx-js-style';

import { loadXlsxStyle } from '@/utils/loadXlsxStyle';
import type { SupplierEvaluationCategory } from '@/types/supplierEvaluation';

import {
  SUPPLIER_EVAL_CATEGORY_COLOR,
  scoreColor,
  scoreStepColor,
} from '../supplierEvaluationUi';
import type { PartnerEvalExportColumn, PartnerEvalExportSheet } from './partnerEvaluationsExportMapper';

type XlsxModule = typeof import('xlsx-js-style');

const HEADER_STYLE: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: '000000' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'D9D9D9' } },
    left: { style: 'thin', color: { rgb: 'D9D9D9' } },
    bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
    right: { style: 'thin', color: { rgb: 'D9D9D9' } },
  },
};

const DATA_BORDER: XLSX.CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'D9D9D9' } },
  left: { style: 'thin', color: { rgb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
  right: { style: 'thin', color: { rgb: 'D9D9D9' } },
};

/** Светлая заливка ~14% акцента на белом (как Tag в UI). */
const SCORE_FILL_BY_HEX: Record<string, string> = {
  '008000': 'E8F5E9', // A / 5 — зелёный
  '52c41a': 'F6FFED', // B
  '88cc00': 'F9FFE8', // 4 — салатовый
  ffbf00: 'FFFBE6', // C / 3 — жёлтый
  cc5500: 'FFF2E8', // 2 — оранжево-красный
  '8b0000': 'FFF1F0', // D / 1 — красный
};

function toRgb(hex: string): string {
  return hex.replace('#', '').toLowerCase();
}

function scoreAccentStyle(hex: string): Pick<XLSX.CellStyle, 'font' | 'fill'> {
  const rgb = toRgb(hex);
  const fillRgb = SCORE_FILL_BY_HEX[rgb] ?? 'F5F5F5';
  return {
    font: { sz: 11, bold: true, color: { rgb: rgb.toUpperCase() } },
    fill: { patternType: 'solid', fgColor: { rgb: fillRgb } },
  };
}

function resolveCellAccent(
  column: PartnerEvalExportColumn,
  raw: string,
  row: string[],
  weightedScoreColIndex: number,
): string | null {
  if (!raw) return null;

  if (column.key === 'category') {
    // Как CategoryTag: приоритет цвета по итоговому баллу, иначе по букве категории.
    const weightedRaw = weightedScoreColIndex >= 0 ? row[weightedScoreColIndex] : '';
    const weighted = Number(weightedRaw);
    if (Number.isFinite(weighted) && weightedRaw) return scoreColor(weighted);
    const category = raw.trim().toUpperCase() as SupplierEvaluationCategory;
    return SUPPLIER_EVAL_CATEGORY_COLOR[category] ?? null;
  }

  if (column.key === 'weighted_score') {
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    return scoreColor(num);
  }

  if (column.key.startsWith('criterion_')) {
    const num = Number(raw);
    if (!Number.isFinite(num)) return null;
    return scoreStepColor(num);
  }

  return null;
}

function estimateWidth(header: string, rows: string[][], colIndex: number): number {
  let max = header.length;
  for (const row of rows) {
    const cell = row[colIndex] ?? '';
    max = Math.max(max, Math.min(cell.length, 48));
  }
  return Math.min(42, Math.max(10, max + 2));
}

function styleSheet(
  xlsx: XlsxModule,
  sheet: XLSX.WorkSheet,
  columns: PartnerEvalExportColumn[],
  rows: string[][],
): void {
  const headers = columns.map(column => column.header);
  const numericCols = new Set(
    columns.map((column, index) => (column.numeric ? index : -1)).filter(index => index >= 0),
  );
  const weightedScoreColIndex = columns.findIndex(column => column.key === 'weighted_score');

  for (let col = 0; col < headers.length; col += 1) {
    const address = xlsx.utils.encode_cell({ r: 0, c: col });
    const cell = sheet[address];
    if (cell) cell.s = HEADER_STYLE;
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    for (let col = 0; col < columns.length; col += 1) {
      const address = xlsx.utils.encode_cell({ r: rowIndex + 1, c: col });
      const existing = sheet[address];
      if (!existing) continue;

      const column = columns[col]!;
      const row = rows[rowIndex] ?? [];
      const raw = row[col] ?? '';
      const accent = resolveCellAccent(column, raw, row, weightedScoreColIndex);
      const accentStyle = accent ? scoreAccentStyle(accent) : null;

      const baseStyle: XLSX.CellStyle = {
        font: accentStyle?.font ?? { sz: 11 },
        fill: accentStyle?.fill,
        alignment: {
          horizontal:
            column.key === 'category' || numericCols.has(col) ? 'center' : 'left',
          vertical: 'center',
        },
        border: DATA_BORDER,
      };

      if (numericCols.has(col) && raw !== '') {
        const num = Number(raw);
        if (Number.isFinite(num)) {
          sheet[address] = { t: 'n', v: num, s: baseStyle };
          continue;
        }
      }
      sheet[address] = { ...existing, s: baseStyle };
    }
  }

  if (sheet['!ref']) {
    sheet['!autofilter'] = { ref: sheet['!ref'] };
  }
  sheet['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
  sheet['!cols'] = headers.map((header, index) => ({
    wch: estimateWidth(header, rows, index),
  }));
  sheet['!rows'] = [{ hpt: 28 }, ...rows.map(() => ({ hpt: 15 }))];
}

function appendSheet(xlsx: XlsxModule, workbook: XLSX.WorkBook, data: PartnerEvalExportSheet): void {
  const headers = data.columns.map(column => column.header);
  const aoa = [headers, ...data.rows];
  const sheet = xlsx.utils.aoa_to_sheet(aoa);
  styleSheet(xlsx, sheet, data.columns, data.rows);
  const safeName = data.sheetName.slice(0, 31) || 'Sheet';
  xlsx.utils.book_append_sheet(workbook, sheet, safeName);
}

export async function exportPartnerEvaluationsToExcel(
  sheets: PartnerEvalExportSheet[],
  fileNamePrefix: string,
): Promise<void> {
  const xlsx = await loadXlsxStyle();
  const workbook = xlsx.utils.book_new();

  for (const sheet of sheets) {
    appendSheet(xlsx, workbook, sheet);
  }

  const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
