import { ExportOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { buildPatentsExportQuery, patentApi } from '@/api/patents/patentApi';
import type { PatentsDeletedScope } from '@/api/patents/patentApi';
import type { PatentsListServerFilters } from '@/api/patents/patentListFilters.types';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';

import {
  getDefaultPatentExportColumnKeys,
  getPatentExportExtraGroupsWithColumns,
  getPatentExportMainColumns,
  loadPatentExportColumnKeys,
  PATENT_EXPORT_COLUMNS,
  savePatentExportColumnKeys,
  type PatentExportColumn,
  type PatentExportColumnKey,
} from '../../export/patentExportColumns';
import { mapPatentsToExportRows } from '../../export/patentExportMapper';
import { enrichReferenceDataForPatentExport } from '../../export/enrichReferenceDataForPatentExport';
import { exportPatentsToExcel } from '../../export/patentExportToExcel';
import styles from './PatentExportModal.module.scss';

type PatentExportModalProps = {
  open: boolean;
  onClose: () => void;
  deletedScope: PatentsDeletedScope;
  serverFilters: PatentsListServerFilters;
  refs: ReferenceDataForPatents;
};

function ExportCheckboxGrid({
  columns,
  disabled,
  gridClassName,
}: {
  columns: PatentExportColumn[];
  disabled: boolean;
  gridClassName: string;
}) {
  return (
    <div className={`${styles.checkboxGrid} ${gridClassName}`}>
      {columns.map(column => (
        <Checkbox key={column.key} value={column.key} disabled={disabled}>
          {column.label}
        </Checkbox>
      ))}
    </div>
  );
}

export function PatentExportModal({
  open,
  onClose,
  deletedScope,
  serverFilters,
  refs,
}: PatentExportModalProps) {
  const { message } = App.useApp();
  const mainColumns = useMemo(() => getPatentExportMainColumns(), []);
  const extraGroups = useMemo(() => getPatentExportExtraGroupsWithColumns(), []);
  const [selectedKeys, setSelectedKeys] = useState<PatentExportColumnKey[]>(() => loadPatentExportColumnKeys());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedKeys(loadPatentExportColumnKeys());
    }
  }, [open]);

  const selectedColumns = useMemo(
    () => PATENT_EXPORT_COLUMNS.filter(column => selectedKeys.includes(column.key)),
    [selectedKeys],
  );

  const handleResetToDefaults = () => {
    setSelectedKeys(getDefaultPatentExportColumnKeys());
  };

  const handleSelectAll = () => {
    setSelectedKeys(PATENT_EXPORT_COLUMNS.map(column => column.key));
  };

  const handleClearAll = () => {
    setSelectedKeys([]);
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      message.warning('Выберите хотя бы одно поле для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const exportQuery = buildPatentsExportQuery(deletedScope, serverFilters);
      const { data, total, truncated } = await patentApi.exportPatents(exportQuery);

      if (data.length === 0) {
        message.info('Нет данных для экспорта по выбранным фильтрам');
        return;
      }

      const columnKeys = selectedColumns.map(column => column.key);
      const headers = selectedColumns.map(column => column.label);
      const exportRefs = await enrichReferenceDataForPatentExport(data, refs);
      const rows = mapPatentsToExportRows(data, exportRefs, columnKeys);
      exportPatentsToExcel(headers, rows, columnKeys);
      savePatentExportColumnKeys(columnKeys);

      if (truncated) {
        message.warning(`Экспортировано ${data.length} из ${total} записей (лимит выгрузки)`);
      } else {
        message.success(`Экспортировано записей: ${data.length}`);
      }
      onClose();
    } catch {
      message.error('Не удалось выполнить экспорт');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      title='Экспорт реестра РИД'
      open={open}
      onCancel={onClose}
      width={860}
      destroyOnHidden
      footer={[
        <Button key='cancel' onClick={onClose} disabled={isExporting}>
          Отмена
        </Button>,
        <Button
          key='export'
          type='primary'
          icon={<ExportOutlined />}
          loading={isExporting}
          onClick={() => void handleExport()}
        >
          Экспорт в Excel
        </Button>,
      ]}
    >
      <div className={styles.content}>
        <p className={styles.intro}>
          При необходимости добавьте дополнительные поля или снимите лишние — ваш выбор сохранится для следующих
          экспортов.
        </p>

        <div className={styles.toolbar}>
          <div className={styles.toolbarActions}>
            <Button onClick={handleResetToDefaults} disabled={isExporting}>
              К умолчанию
            </Button>
            <Button onClick={handleSelectAll} disabled={isExporting}>
              Выбрать все
            </Button>
            <Button onClick={handleClearAll} disabled={isExporting}>
              Снять все
            </Button>
          </div>
          <span className={styles.selectionSummary}>
            Выбрано полей: {selectedKeys.length} из {PATENT_EXPORT_COLUMNS.length}
          </span>
        </div>

        <Checkbox.Group
          value={selectedKeys}
          onChange={values => setSelectedKeys(values as PatentExportColumnKey[])}
          style={{ width: '100%' }}
        >
          <div className={styles.sectionsStack}>
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Основные поля</h4>
              <ExportCheckboxGrid
                columns={mainColumns}
                disabled={isExporting}
                gridClassName={styles.checkboxGridMain}
              />
            </section>

            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Дополнительные поля</h4>
              <div className={styles.extraGroups}>
                {extraGroups.map(group => (
                  <div key={group.id} className={styles.fieldGroup}>
                    <h5 className={styles.groupTitle}>{group.title}</h5>
                    <ExportCheckboxGrid
                      columns={group.columns}
                      disabled={isExporting}
                      gridClassName={styles.checkboxGridExtra}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </Checkbox.Group>
      </div>
    </Modal>
  );
}
