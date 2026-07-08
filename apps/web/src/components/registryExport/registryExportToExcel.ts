import type * as XLSX from 'xlsx-js-style';

import type { RegistryExportCellAlignment, RegistryExportExcelOptions, RegistryExportCellValue, RegistryExportFileLink } from './registryExportTypes';
import { loadXlsxStyle } from '@/utils/loadXlsxStyle';

type XlsxModule = typeof import('xlsx-js-style');

const HEADER_ROW_HEIGHT_PT = 28;
const DATA_ROW_HEIGHT_PT = 15;
const MIN_COLUMN_WIDTH = 8;
const MAX_COLUMN_WIDTH = 42;
const DEFAULT_MAX_TEXT_WIDTH = 24;

const CELL_BORDER: XLSX.CellStyle['border'] = {
  top: { style: 'thin', color: { rgb: 'D9D9D9' } },
  left: { style: 'thin', color: { rgb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
  right: { style: 'thin', color: { rgb: 'D9D9D9' } },
};

const HEADER_CELL_STYLE: XLSX.CellStyle = {
  font: { bold: true, sz: 11, color: { rgb: '000000' } },
  fill: { patternType: 'solid', fgColor: { rgb: 'F5F5F5' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border: CELL_BORDER,
};

function defaultAlignment<TKey extends string>(
  key: TKey,
  options: RegistryExportExcelOptions<TKey>,
): RegistryExportCellAlignment {
  if (options.getAlignment) return options.getAlignment(key);
  if (options.numericKeys?.has(key)) return 'right';
  if (options.centerKeys?.has(key)) return 'center';
  return 'left';
}

function buildAlignmentStyle(alignment: RegistryExportCellAlignment): XLSX.CellStyle['alignment'] {
  return { horizontal: alignment, vertical: 'center', wrapText: false };
}

function buildDataCellStyle<TKey extends string>(
  key: TKey,
  options: RegistryExportExcelOptions<TKey>,
): XLSX.CellStyle {
  return {
    font: { sz: 11 },
    alignment: buildAlignmentStyle(defaultAlignment(key, options)),
    border: CELL_BORDER,
  };
}

function getNumericCellFormat<TKey extends string>(
  key: TKey,
  options: RegistryExportExcelOptions<TKey>,
): string | undefined {
  if (options.getNumericFormat) {
    const custom = options.getNumericFormat(key);
    if (custom) return custom;
  }
  if (options.moneyKeys?.has(key)) return '#,##0.00';
  if (options.integerKeys?.has(key)) return '#,##0';
  return undefined;
}

function getExportCellPlainText(value: RegistryExportCellValue): string {
  if (typeof value === 'string') return value;
  return value.links.map(link => link.name).join('\n');
}

function getHyperlinkCount(value: RegistryExportCellValue): number {
  if (typeof value === 'string') return 0;
  return value.links.length;
}

function expandRowsWithHyperlinks<TKey extends string>(
  rows: RegistryExportCellValue[][],
  columnKeys: TKey[],
  hyperlinkKeys: ReadonlySet<TKey>,
): { rows: RegistryExportCellValue[][]; merges: XLSX.Range[] } {
  const hyperlinkColIndexes = columnKeys
    .map((key, index) => (hyperlinkKeys.has(key) ? index : -1))
    .filter(index => index >= 0);

  if (hyperlinkColIndexes.length === 0) {
    return { rows, merges: [] };
  }

  const expandedRows: RegistryExportCellValue[][] = [];
  const merges: XLSX.Range[] = [];
  let dataRowOffset = 0;

  for (const row of rows) {
    const span = Math.max(
      1,
      ...hyperlinkColIndexes.map(colIndex => getHyperlinkCount(row[colIndex] ?? '')),
    );
    const startDataRow = dataRowOffset;

    for (let linkIndex = 0; linkIndex < span; linkIndex++) {
      expandedRows.push(
        row.map((cell, colIndex) => {
          if (hyperlinkColIndexes.includes(colIndex)) {
            if (typeof cell !== 'object' || !cell.links?.length) return '';
            const link = cell.links[linkIndex];
            return link ? { links: [link] } : '';
          }
          return linkIndex === 0 ? cell : '';
        }),
      );
      dataRowOffset += 1;
    }

    if (span > 1) {
      columnKeys.forEach((key, colIndex) => {
        if (hyperlinkKeys.has(key)) return;
        merges.push({
          s: { r: startDataRow + 1, c: colIndex },
          e: { r: startDataRow + span, c: colIndex },
        });
      });
    }
  }

  return { rows: expandedRows, merges };
}

function buildHyperlinkCell(
  links: RegistryExportFileLink[],
  baseStyle: XLSX.CellStyle,
): XLSX.CellObject {
  const link = links[0];
  if (!link) {
    return { t: 's', v: '', s: baseStyle };
  }

  const linkStyle: XLSX.CellStyle = {
    ...baseStyle,
    font: {
      ...(baseStyle.font ?? {}),
      sz: baseStyle.font?.sz ?? 11,
      color: { rgb: '0563C1' },
      underline: true,
    },
    alignment: {
      ...(baseStyle.alignment ?? {}),
      vertical: 'center',
    },
  };

  return {
    t: 's',
    v: link.name,
    l: { Target: link.url, Tooltip: link.name },
    s: linkStyle,
  };
}

function applyHeaderStyles(xlsx: XlsxModule, worksheet: XLSX.WorkSheet, headers: string[]): void {
  headers.forEach((header, colIndex) => {
    const cellAddress = xlsx.utils.encode_cell({ r: 0, c: colIndex });
    const existingCell = worksheet[cellAddress];
    worksheet[cellAddress] = {
      ...(existingCell ?? { t: 's', v: header }),
      s: HEADER_CELL_STYLE,
    };
  });

  worksheet['!rows'] = [{ hpt: HEADER_ROW_HEIGHT_PT }];
}

function estimateColumnWidth<TKey extends string>(
  key: TKey,
  header: string,
  rows: RegistryExportCellValue[][],
  colIndex: number,
  options: RegistryExportExcelOptions<TKey>,
): number {
  const sampleValues = rows.slice(0, 50).map(row => getExportCellPlainText(row[colIndex] ?? ''));
  const longestSample = sampleValues.reduce((max, value) => Math.max(max, value.length), 0);
  const base = Math.max(header.length, longestSample) + 2;

  if (options.longTextKeys?.has(key)) {
    return Math.min(Math.max(base, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
  }

  return Math.min(Math.max(base, MIN_COLUMN_WIDTH), DEFAULT_MAX_TEXT_WIDTH);
}

function applyWorksheetEnhancements<TKey extends string>(
  xlsx: XlsxModule,
  worksheet: XLSX.WorkSheet,
  headers: string[],
  rows: RegistryExportCellValue[][],
  columnKeys: TKey[],
  options: RegistryExportExcelOptions<TKey>,
): void {
  applyHeaderStyles(xlsx, worksheet, headers);

  rows.forEach((row, rowIndex) => {
    columnKeys.forEach((key, colIndex) => {
      const cellAddress = xlsx.utils.encode_cell({ r: rowIndex + 1, c: colIndex });
      const existingCell = worksheet[cellAddress];
      if (!existingCell) return;

      const raw = row[colIndex] ?? '';
      const style = buildDataCellStyle(key, options);
      const numFmt = getNumericCellFormat(key, options);
      const isNumeric = typeof raw === 'string' && options.numericKeys?.has(key) && raw !== '';
      const num = isNumeric ? Number(raw) : NaN;

      if (typeof raw === 'object' && raw.links) {
        worksheet[cellAddress] = buildHyperlinkCell(raw.links, style);
        return;
      }

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
    wch: estimateColumnWidth(key, headers[index] ?? '', rows, index, options),
  }));

  worksheet['!rows'] = [{ hpt: HEADER_ROW_HEIGHT_PT }, ...rows.map(() => ({ hpt: DATA_ROW_HEIGHT_PT }))];
}

export async function exportRegistryToExcel<TKey extends string>(
  options: RegistryExportExcelOptions<TKey>,
  headers: string[],
  rows: RegistryExportCellValue[][],
  columnKeys: TKey[],
): Promise<void> {
  const xlsx = await loadXlsxStyle();

  const { rows: exportRows, merges } =
    options.hyperlinkKeys?.size ?
      expandRowsWithHyperlinks(rows, columnKeys, options.hyperlinkKeys)
    : { rows, merges: [] as XLSX.Range[] };

  const plainRows = exportRows.map(row => row.map(cell => getExportCellPlainText(cell)));
  const worksheet = xlsx.utils.aoa_to_sheet([headers, ...plainRows]);
  if (merges.length > 0) {
    worksheet['!merges'] = merges;
  }
  applyWorksheetEnhancements(xlsx, worksheet, headers, exportRows, columnKeys, options);

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, options.sheetName);
  const fileName = `${options.fileNamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  xlsx.writeFile(workbook, fileName);
}
