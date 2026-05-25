import { ExportOutlined } from '@ant-design/icons';
import { App, Button, Checkbox, Modal } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  getDefaultExportColumnKeys,
  getExportExtraGroupsWithColumns,
  getExportMainColumns,
  loadExportColumnKeys,
  saveExportColumnKeys,
  type RegistryExportExtraGroupWithColumns,
} from './registryExportColumnUtils';
import type { RegistryExportColumn, RegistryExportExtraSectionLayout } from './registryExportTypes';
import styles from './RegistryExportModal.module.scss';

export type RegistryExportModalConfig<TKey extends string> = {
  columns: RegistryExportColumn<TKey>[];
  extraGroups: RegistryExportExtraGroup<TKey>[];
  storageKey: string;
};

type RegistryExportModalProps<TKey extends string> = {
  open: boolean;
  onClose: () => void;
  title: string;
  config: RegistryExportModalConfig<TKey>;
  isExporting?: boolean;
  onExport: (selectedKeys: TKey[]) => Promise<void>;
};

function ExportCheckboxGrid<TKey extends string>({
  columns,
  disabled,
  gridClassName,
  layout,
  compact,
}: {
  columns: RegistryExportColumn<TKey>[];
  disabled: boolean;
  gridClassName: string;
  layout?: RegistryExportExtraSectionLayout;
  compact?: boolean;
}) {
  const useSplitLayout = layout === 'split' || (layout == null && (compact ?? columns.length >= 5));

  if (layout === 'row') {
    return (
      <div className={`${styles.checkboxGrid} ${gridClassName} ${styles.checkboxGridRow}`}>
        {columns.map(column => (
          <Checkbox key={column.key} value={column.key} disabled={disabled} className={styles.checkboxItem}>
            {column.label}
          </Checkbox>
        ))}
      </div>
    );
  }

  if (useSplitLayout) {
    const splitAt = Math.ceil(columns.length / 2);
    const leftColumns = columns.slice(0, splitAt);
    const rightColumns = columns.slice(splitAt);

    return (
      <div className={`${styles.checkboxGrid} ${gridClassName} ${styles.checkboxGridSplit}`}>
        <div className={styles.checkboxGridColumn}>
          {leftColumns.map(column => (
            <Checkbox key={column.key} value={column.key} disabled={disabled} className={styles.checkboxItem}>
              {column.label}
            </Checkbox>
          ))}
        </div>
        <div className={styles.checkboxGridColumn}>
          {rightColumns.map(column => (
            <Checkbox key={column.key} value={column.key} disabled={disabled} className={styles.checkboxItem}>
              {column.label}
            </Checkbox>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.checkboxGrid} ${gridClassName}`}>
      {columns.map(column => (
        <Checkbox key={column.key} value={column.key} disabled={disabled} className={styles.checkboxItem}>
          {column.label}
        </Checkbox>
      ))}
    </div>
  );
}

function renderExtraFieldGroups<TKey extends string>(
  groups: RegistryExportExtraGroupWithColumns<TKey>[],
  isExporting: boolean,
) {
  return groups.map(group => (
    <div key={group.id} className={styles.fieldGroup}>
      <h5 className={styles.groupTitle}>{group.title}</h5>
      {group.sections?.length ? (
        <div className={styles.fieldGroupSections}>
          {group.sections.map((section, index) => (
            <div key={section.title ?? `${group.id}-section-${index}`} className={styles.fieldGroupSection}>
              {section.title ? <h6 className={styles.subgroupTitle}>{section.title}</h6> : null}
              <ExportCheckboxGrid
                columns={section.columns}
                disabled={isExporting}
                gridClassName={styles.checkboxGridExtra}
                layout={section.layout ?? 'stack'}
              />
            </div>
          ))}
        </div>
      ) : (
        <ExportCheckboxGrid
          columns={group.columns}
          disabled={isExporting}
          gridClassName={styles.checkboxGridExtra}
        />
      )}
    </div>
  ));
}

export function RegistryExportModal<TKey extends string>({
  open,
  onClose,
  title,
  config,
  isExporting: isExportingExternal,
  onExport,
}: RegistryExportModalProps<TKey>) {
  const { message } = App.useApp();
  const { columns, extraGroups, storageKey } = config;
  const mainColumns = useMemo(() => getExportMainColumns(columns), [columns]);
  const extraGroupsWithColumns = useMemo(
    () => getExportExtraGroupsWithColumns(columns, extraGroups),
    [columns, extraGroups],
  );
  const { leftExtraGroups, rightExtraGroups } = useMemo(() => {
    const hasExplicitColumns = extraGroupsWithColumns.some(group => group.column != null);
    if (!hasExplicitColumns) {
      return {
        leftExtraGroups: extraGroupsWithColumns.filter((_, index) => index % 2 === 0),
        rightExtraGroups: extraGroupsWithColumns.filter((_, index) => index % 2 === 1),
      };
    }

    return {
      leftExtraGroups: extraGroupsWithColumns.filter(group => (group.column ?? 0) === 0),
      rightExtraGroups: extraGroupsWithColumns.filter(group => group.column === 1),
    };
  }, [extraGroupsWithColumns]);
  const [selectedKeys, setSelectedKeys] = useState<TKey[]>(() =>
    loadExportColumnKeys(columns, storageKey),
  );
  const [isExportingInternal, setIsExportingInternal] = useState(false);
  const isExporting = isExportingExternal ?? isExportingInternal;

  useEffect(() => {
    if (open) {
      setSelectedKeys(loadExportColumnKeys(columns, storageKey));
    }
  }, [open, columns, storageKey]);

  const handleResetToDefaults = () => {
    setSelectedKeys(getDefaultExportColumnKeys(columns));
  };

  const handleSelectAll = () => {
    setSelectedKeys(columns.map(column => column.key));
  };

  const handleClearAll = () => {
    setSelectedKeys([]);
  };

  const handleExport = async () => {
    if (selectedKeys.length === 0) {
      message.warning('Выберите хотя бы одно поле для экспорта');
      return;
    }

    const runExport = async () => {
      await onExport(selectedKeys);
      saveExportColumnKeys(storageKey, selectedKeys);
    };

    if (isExportingExternal != null) {
      await runExport();
      return;
    }

    setIsExportingInternal(true);
    try {
      await runExport();
    } catch {
      message.error('Не удалось выполнить экспорт');
    } finally {
      setIsExportingInternal(false);
    }
  };

  return (
    <Modal
      title={title}
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
            Выбрано полей: {selectedKeys.length} из {columns.length}
          </span>
        </div>

        <Checkbox.Group
          value={selectedKeys}
          onChange={values => setSelectedKeys(values as TKey[])}
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
                <div className={styles.extraGroupsColumn}>
                  {renderExtraFieldGroups(leftExtraGroups, isExporting)}
                </div>
                <div className={styles.extraGroupsColumn}>
                  {renderExtraFieldGroups(rightExtraGroups, isExporting)}
                </div>
              </div>
            </section>
          </div>
        </Checkbox.Group>
      </div>
    </Modal>
  );
}
