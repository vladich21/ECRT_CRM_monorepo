import { Button, Modal, Select } from 'antd';

import type { SwStructureNode } from '@/types/swRegistry';
import { flattenStructureOptions } from '../structure/swStructureTree';
import styles from './SwItemsFiltersModal.module.scss';
import type { SwItemsAdvancedFilters } from './SwItemsListPage.types';

type SelectOption = { label: string; value: string };

type Props = {
  open: boolean;
  draftFilters: SwItemsAdvancedFilters;
  structureTree: SwStructureNode[];
  partnerOptions: SelectOption[];
  onUpdateDraftFilter: (patch: Partial<SwItemsAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

export function SwItemsFiltersModal({
  open,
  draftFilters,
  structureTree,
  partnerOptions,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
}: Props) {
  const elementOptions = flattenStructureOptions(structureTree);

  return (
    <Modal
      title='Фильтры реестра ПО'
      open={open}
      onCancel={onClose}
      width={560}
      footer={[
        <Button key='reset' onClick={onReset}>
          Сбросить
        </Button>,
        <Button key='cancel' onClick={onClose}>
          Отмена
        </Button>,
        <Button key='apply' type='primary' onClick={onApply}>
          Применить
        </Button>,
      ]}
    >
      <div className={styles.filtersModalGrid}>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Элемент структуры</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все элементы'
            allowClear
            showSearch
            optionFilterProp='label'
            options={elementOptions}
            value={draftFilters.elementId}
            onChange={v => onUpdateDraftFilter({ elementId: v ?? undefined })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Организация-разработчик</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все контрагенты'
            allowClear
            showSearch
            optionFilterProp='label'
            options={partnerOptions}
            value={draftFilters.partnerId}
            onChange={v => onUpdateDraftFilter({ partnerId: v ?? undefined })}
          />
        </div>
      </div>
    </Modal>
  );
}
