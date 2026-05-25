import { exportRegistryToExcel } from '../../../components/registryExport/registryExportToExcel';

import { PATENT_EXPORT_EXCEL_OPTIONS, type PatentExportColumnKey } from './patentExportColumns';

export function exportPatentsToExcel(
  headers: string[],
  rows: string[][],
  columnKeys: PatentExportColumnKey[],
  fileNamePrefix = 'reestr_rid',
): void {
  exportRegistryToExcel(
    { ...PATENT_EXPORT_EXCEL_OPTIONS, fileNamePrefix },
    headers,
    rows,
    columnKeys,
  );
}
