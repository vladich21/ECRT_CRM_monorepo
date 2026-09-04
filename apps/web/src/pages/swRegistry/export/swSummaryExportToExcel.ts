import { exportRegistryToExcel } from '@/components/registryExport/registryExportToExcel';
import type { RegistryExportCellValue } from '@/components/registryExport/registryExportTypes';
import type { SwSummaryResponse, SwSummaryRow } from '@/types/swRegistry';

import { getSummaryStatusShortLabel } from '../swSummaryStatusLabels';
import { SUMMARY_BY_LABEL, type SummaryBy } from '../swSummaryNavigation';

type SummaryExportColumnKey = 'row' | `doc_${string}` | `sheet_${string}`;

const SUMMARY_EXPORT_OPTIONS = {
  sheetName: 'Свод по статусам',
  fileNamePrefix: 'svod_po_statusam',
  integerKeys: new Set<SummaryExportColumnKey>(),
} as const;

function buildColumnKeys(data: SwSummaryResponse): SummaryExportColumnKey[] {
  const keys: SummaryExportColumnKey[] = ['row'];
  for (const col of data.columns.document) keys.push(`doc_${col.code}`);
  for (const col of data.columns.sheet) keys.push(`sheet_${col.code}`);
  return keys;
}

function buildHeaders(data: SwSummaryResponse): string[] {
  const headers = ['Строка'];
  for (const col of data.columns.document) {
    headers.push(`Док: ${getSummaryStatusShortLabel(col.code, 'document')}`);
  }
  for (const col of data.columns.sheet) {
    headers.push(`ЛУ: ${getSummaryStatusShortLabel(col.code, 'sheet')}`);
  }
  return headers;
}

function rowToCells(
  data: SwSummaryResponse,
  row: SwSummaryRow,
  resolveRowName?: (row: SwSummaryRow) => string,
): RegistryExportCellValue[] {
  const cells: RegistryExportCellValue[] = [resolveRowName?.(row) ?? row.name];
  for (const col of data.columns.document) {
    cells.push(String(row.documentCounts[col.code] ?? 0));
  }
  for (const col of data.columns.sheet) {
    cells.push(String(row.sheetCounts[col.code] ?? 0));
  }
  return cells;
}

export async function exportSwSummaryToExcel(
  data: SwSummaryResponse,
  by: SummaryBy,
  resolveRowName?: (row: SwSummaryRow) => string,
): Promise<void> {
  const columnKeys = buildColumnKeys(data);
  const headers = buildHeaders(data);
  headers[0] = SUMMARY_BY_LABEL[by];

  const integerKeys = new Set<SummaryExportColumnKey>(columnKeys.filter(k => k !== 'row'));
  const rows: RegistryExportCellValue[][] = data.rows.map(row => rowToCells(data, row, resolveRowName));
  rows.push([
    'Итого',
    ...data.columns.document.map(col => String(data.totals.documentCounts[col.code] ?? 0)),
    ...data.columns.sheet.map(col => String(data.totals.sheetCounts[col.code] ?? 0)),
  ]);

  await exportRegistryToExcel(
    { ...SUMMARY_EXPORT_OPTIONS, integerKeys },
    headers,
    rows,
    columnKeys,
  );
}
