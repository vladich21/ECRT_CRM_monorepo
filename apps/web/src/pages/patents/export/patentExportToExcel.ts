import { exportRegistryToExcel } from '../../../components/registryExport/registryExportToExcel';
import type { RegistryExportCellValue } from '../../../components/registryExport/registryExportTypes';

import { PATENT_EXPORT_EXCEL_OPTIONS, type PatentExportColumnKey } from './patentExportColumns';

export function exportPatentsToExcel(
  headers: string[],
  rows: RegistryExportCellValue[][],
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
