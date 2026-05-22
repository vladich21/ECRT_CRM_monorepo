import * as XLSX from 'xlsx-js-style';

import {
  getPatentExportColumnAlignment,
  PATENT_EXPORT_INTEGER_COLUMN_KEYS,
  PATENT_EXPORT_MONEY_COLUMN_KEYS,
  PATENT_EXPORT_NUMERIC_COLUMN_KEYS,
  type PatentExportCellAlignment,
  type PatentExportColumnKey,
} from './patentExportColumns';

const NUMERIC_COLUMN_KEYS = PATENT_EXPORT_NUMERIC_COLUMN_KEYS;
const HEADER_ROW_HEIGHT_PT = 28;
const DATA_ROW_HEIGHT_PT = 15;
const MIN_COLUMN_WIDTH = 8;
const MAX_COLUMN_WIDTH = 42;
const LONG_TEXT_COLUMN_KEYS = new Set<PatentExportColumnKey>([
  'name',
  'project',
  'authors',
  'areas',
  'grants',
  'transformation_notification_ic_zht',
  'transformation_notification_cir',
]);

const CELL_BORDER: XLSX.CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'D9D9D9' } },
  left: { style: 'thin', color: { rgb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
  right: { style: 'thin', color: { rgb: 'D9D9D9' } },
};

function buildAlignmentStyle(alignment: PatentExportCellAlignment): XLSX.CellStyle['alignment'] {
  return { horizontal: alignment, vertical: 'center', wrapText: false };
}

const HEADER_CELL_STYLE: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: '000000' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: CELL_BORDER,
};

function buildDataCellStyle(key: PatentExportColumnKey): XLSX.CellStyle {
  const alignment = getPatentExportColumnAlignment(key);
  return {
    font: { sz: 11 },
    alignment: buildAlignmentStyle(alignment),
    border: CELL_BORDER,
  };
}

function getNumericCellFormat(key: PatentExportColumnKey): string | undefined {
  if (PATENT_EXPORT_MONEY_COLUMN_KEYS.has(key)) return '#,##0.00';
  if (PATENT_EXPORT_INTEGER_COLUMN_KEYS.has(key)) return '#,##0';
  if (key === 'rid_vat_rate') return '0.##';
  return undefined;
}

function applyHeaderStyles(worksheet: XLSX.WorkSheet, headers: string[]): void {
  headers.forEach((header, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: colIndex });
    const existingCell = worksheet[cellAddress];
    worksheet[cellAddress] = {
      ...(existingCell ?? { t: 's', v: header }),
      s: HEADER_CELL_STYLE,
    };
  });

  worksheet['!rows'] = [{ hpt: HEADER_ROW_HEIGHT_PT }];
}

function estimateColumnWidth(
  key: PatentExportColumnKey,
  header: string,
  rows: string[][],
  colIndex: number,
): number {
  const sampleValues = rows.slice(0, 50).map(row => String(row[colIndex] ?? ''));
  const longestSample = sampleValues.reduce((max, value) => Math.max(max, value.length), 0);
  const base = Math.max(header.length, longestSample) + 2;

  if (LONG_TEXT_COLUMN_KEYS.has(key)) {
    return Math.min(Math.max(base, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
  }

  return Math.min(Math.max(base, MIN_COLUMN_WIDTH), 24);
}

function applyWorksheetEnhancements(
  worksheet: XLSX.WorkSheet,
  headers: string[],
  rows: string[][],
  columnKeys: PatentExportColumnKey[],
): void {
  applyHeaderStyles(worksheet, headers);

  rows.forEach((row, rowIndex) => {
    columnKeys.forEach((key, colIndex) => {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      const existingCell = worksheet[cellAddress];
      if (!existingCell) return;

      const raw = row[colIndex];
      const style = buildDataCellStyle(key);
      const numFmt = getNumericCellFormat(key);
      const isNumeric = NUMERIC_COLUMN_KEYS.has(key) && raw !== '';
      const num = isNumeric ? Number(raw) : NaN;

      if (isNumeric && Number.isFinite(num)) {
        worksheet[cellAddress] = {
          t: 'n',
          v: num,
          s: numFmt ? { ...style, numFmt } : style,
        };
        return;
      }

      worksheet[cellAddress] = { ...existingCell, s: style };
    });
  });

  if (worksheet['!ref']) {
    worksheet['!autofilter'] = { ref: worksheet['!ref'] };
  }

  worksheet['!views'] = [{ state: 'frozen', ySplit: 1, topLeftCell: 'A2', activeCell: 'A2' }];
  worksheet['!pageSetup'] = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  worksheet['!cols'] = columnKeys.map((key, index) => ({
    wch: estimateColumnWidth(key, headers[index] ?? '', rows, index),
  }));

  worksheet['!rows'] = [
    { hpt: HEADER_ROW_HEIGHT_PT },
    ...rows.map(() => ({ hpt: DATA_ROW_HEIGHT_PT })),
  ];
}

export function exportPatentsToExcel(
  headers: string[],
  rows: string[][],
  columnKeys: PatentExportColumnKey[],
  fileNamePrefix = 'reestr_rid',
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  applyWorksheetEnhancements(worksheet, headers, rows, columnKeys);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'РИД');
  const fileName = `${fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
