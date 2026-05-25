import { App } from 'antd';
import { useState } from 'react';

import { buildPatentsExportQuery, patentApi } from '@/api/patents/patentApi';
import type { PatentsDeletedScope } from '@/api/patents/patentApi';
import type { PatentsListServerFilters } from '@/api/patents/patentListFilters.types';
import { RegistryExportModal } from '@/components/registryExport/RegistryExportModal';
import { getExportColumnsByKeys, getExportColumnHeader } from '@/components/registryExport/registryExportColumnUtils';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';

import { enrichReferenceDataForPatentExport } from '../../export/enrichReferenceDataForPatentExport';
import {
  PATENT_EXPORT_MODAL_CONFIG,
  type PatentExportColumnKey,
} from '../../export/patentExportColumns';
import { mapPatentsToExportRows } from '../../export/patentExportMapper';
import { exportPatentsToExcel } from '../../export/patentExportToExcel';

type PatentExportModalProps = {
  open: boolean;
  onClose: () => void;
  deletedScope: PatentsDeletedScope;
  serverFilters: PatentsListServerFilters;
  refs: ReferenceDataForPatents;
};

export function PatentExportModal({
  open,
  onClose,
  deletedScope,
  serverFilters,
  refs,
}: PatentExportModalProps) {
  const { message } = App.useApp();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (selectedKeys: PatentExportColumnKey[]) => {
    setIsExporting(true);
    try {
      const exportQuery = buildPatentsExportQuery(deletedScope, serverFilters);
      const { data, total, truncated } = await patentApi.exportPatents(exportQuery);

      if (data.length === 0) {
        message.info('Нет данных для экспорта по выбранным фильтрам');
        return;
      }

      const selectedColumns = getExportColumnsByKeys(PATENT_EXPORT_MODAL_CONFIG.columns, selectedKeys);
      const headers = selectedColumns.map(column => getExportColumnHeader(column));
      const exportRefs = await enrichReferenceDataForPatentExport(data, refs);
      const rows = mapPatentsToExportRows(data, exportRefs, selectedKeys);
      exportPatentsToExcel(headers, rows, selectedKeys);

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
      title='Экспорт реестра РИД'
      config={PATENT_EXPORT_MODAL_CONFIG}
      isExporting={isExporting}
      onExport={handleExport}
    />
  );
}
