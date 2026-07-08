import { exportRegistryToExcel } from '../../../components/registryExport/registryExportToExcel';
import type { RegistryExportCellValue } from '../../../components/registryExport/registryExportTypes';

import { PARTNER_EXPORT_EXCEL_OPTIONS, type PartnerExportColumnKey } from './partnerExportColumns';

export async function exportPartnersToExcel(
  headers: string[],
  rows: RegistryExportCellValue[][],
  columnKeys: PartnerExportColumnKey[],
  fileNamePrefix = 'reestr_kontragentov',
): Promise<void> {
  await exportRegistryToExcel(
    { ...PARTNER_EXPORT_EXCEL_OPTIONS, fileNamePrefix },
    headers,
    rows,
    columnKeys,
  );
}
