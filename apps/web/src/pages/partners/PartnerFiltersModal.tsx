import type { ReactNode } from 'react';
import { Button, Modal, Select } from 'antd';

import styles from './PartnersListPage.module.scss';

export type PartnerFilters = {
  typeIds: string[];
  statusIds: string[];
  competenceIds: string[];
};
export const EMPTY_FILTERS: PartnerFilters = {
  typeIds: [],
  statusIds: [],
  competenceIds: [],
};
type SelectOption = {
  label: string;
  value: string;
};
type Props = {
  open: boolean;
  draftFilters: PartnerFilters;
  onUpdateDraftFilter: (patch: Partial<PartnerFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: {
    types: SelectOption[];
    statuses: SelectOption[];
    competencies: SelectOption[];
  };
};
export function PartnerFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
  selectOptions,
}: Props) {
  const footer: ReactNode[] = [
    <Button key='reset' onClick={onReset}>
      Сбросить
    </Button>,
    <Button key='cancel' onClick={onClose}>
      Отмена
    </Button>,
    <Button key='apply' type='primary' onClick={onApply}>
      Применить
    </Button>,
  ];
  return (
    <Modal
      title='Фильтры контрагентов'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={640}
      destroyOnHidden
      footer={footer}
    >
      <div className={styles.filtersModalGrid}>
        <FilterField label='Тип контрагента'>
          <Select
            mode='multiple'
            className={styles.filtersModalControl}
            placeholder='Все типы'
            allowClear
            options={selectOptions.types}
            value={draftFilters.typeIds}
            onChange={value => onUpdateDraftFilter({ typeIds: value })}
          />
        </FilterField>

        <FilterField label='Статус'>
          <Select
            mode='multiple'
            className={styles.filtersModalControl}
            placeholder='Все статусы'
            allowClear
            options={selectOptions.statuses}
            value={draftFilters.statusIds}
            onChange={value => onUpdateDraftFilter({ statusIds: value })}
          />
        </FilterField>

        <FilterField label='Компетенции'>
          <Select
            mode='multiple'
            className={styles.filtersModalControl}
            placeholder='Все компетенции'
            allowClear
            options={selectOptions.competencies}
            value={draftFilters.competenceIds}
            onChange={value => onUpdateDraftFilter({ competenceIds: value })}
          />
        </FilterField>
      </div>
    </Modal>
  );
}
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.filtersModalField}>
      <span className={styles.filtersModalLabel}>{label}</span>
      {children}
    </div>
  );
}
