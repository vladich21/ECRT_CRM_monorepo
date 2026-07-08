import { App } from 'antd';
import { useState } from 'react';

import { buildPartnersExportQuery, partnerApi } from '../../../../api/partners/partnerApi';
import type { PartnerListParams } from '../../../../api/partners/partnerApi';
import { RegistryExportModal } from '../../../../components/registryExport/RegistryExportModal';
import { getExportColumnsByKeys, getExportColumnHeader } from '../../../../components/registryExport/registryExportColumnUtils';

import {
  PARTNER_EXPORT_MODAL_CONFIG,
  type PartnerExportColumnKey,
} from '../../export/partnerExportColumns';
import { mapPartnersToExportRows, type ReferenceDataForPartnersExport } from '../../export/partnerExportMapper';
import { exportPartnersToExcel } from '../../export/partnerExportToExcel';

type PartnerExportModalProps = {
  open: boolean;
  onClose: () => void;
  exportFilters: PartnerListParams;
  references: ReferenceDataForPartnersExport;
};

export function PartnerExportModal({ open, onClose, exportFilters, references }: PartnerExportModalProps) {
  const { message } = App.useApp();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (selectedKeys: PartnerExportColumnKey[]) => {
    setIsExporting(true);
    try {
      const exportQuery = buildPartnersExportQuery(exportFilters);
      const { data, total, truncated } = await partnerApi.exportPartners(exportQuery);

      if (data.length === 0) {
        message.info('Нет данных для экспорта по выбранным фильтрам');
        return;
      }

      const selectedColumns = getExportColumnsByKeys(PARTNER_EXPORT_MODAL_CONFIG.columns, selectedKeys);
      const headers = selectedColumns.map(column => getExportColumnHeader(column));
      const rows = mapPartnersToExportRows(data, references, selectedKeys);
      await exportPartnersToExcel(headers, rows, selectedKeys);

      if (truncated) {
        message.warning(`Экспортировано ${data.length} из ${total} записей (лимит выгрузки)`);
      } else {
        message.success(`Экспортировано записей: ${data.length}`);
      }
      onClose();
    } catch {
      message.error('Не удалось выполнить экспорт');
      throw new Error('export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <RegistryExportModal
      open={open}
      onClose={onClose}
      title='Экспорт реестра контрагентов'
      config={PARTNER_EXPORT_MODAL_CONFIG}
      isExporting={isExporting}
      onExport={handleExport}
    />
  );
}

export type { ReferenceDataForPartnersExport };
