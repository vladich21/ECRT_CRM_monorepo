import { Button, DatePicker, InputNumber, Modal, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import styles from './ContractsListPage.module.scss';
import type { AdvancedFilters } from './ContractsListPage.types';

type SelectOption = { label: string; value: string };

type ContractFiltersModalProps = {
  open: boolean;
  draftFilters: AdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<AdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: {
    partners: SelectOption[];
    categories: SelectOption[];
    states: SelectOption[];
  };
};

export function ContractFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
  selectOptions,
}: ContractFiltersModalProps) {
  return (
    <Modal
      title='Фильтры договоров'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      okText='Применить'
      cancelText='Отмена'
      width={900}
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
          <span className={styles.filtersModalLabel}>Партнёр</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все партнёры'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.partners}
            value={draftFilters.partnerId ?? undefined}
            onChange={value => onUpdateDraftFilter({ partnerId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Категория</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все категории'
            allowClear
            options={selectOptions.categories}
            value={draftFilters.categoryId ?? undefined}
            onChange={value => onUpdateDraftFilter({ categoryId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Состояние</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все состояния'
            allowClear
            options={selectOptions.states}
            value={draftFilters.stateId ?? undefined}
            onChange={value => onUpdateDraftFilter({ stateId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Период действия</span>
          <DatePicker.RangePicker
            className={styles.filtersModalControl}
            placeholder={['Дата с', 'Дата по']}
            format='DD.MM.YYYY'
            value={draftFilters.dateRange}
            onChange={dates => onUpdateDraftFilter({ dateRange: dates as [Dayjs, Dayjs] | null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Сумма с НДС</span>
          <div className={styles.filtersModalAmountRow}>
            <InputNumber
              className={styles.filtersModalAmountInput}
              placeholder='От'
              min={0}
              value={draftFilters.amountMin ?? undefined}
              onChange={value => onUpdateDraftFilter({ amountMin: value ?? null })}
              formatter={value => (value != null ? Number(value).toLocaleString('ru-RU') : '')}
              parser={value => (value ? Number(String(value).replace(/\s/g, '')) : 0)}
            />
            <span className={styles.filtersModalAmountSep}>—</span>
            <InputNumber
              className={styles.filtersModalAmountInput}
              placeholder='До'
              min={0}
              value={draftFilters.amountMax ?? undefined}
              onChange={value => onUpdateDraftFilter({ amountMax: value ?? null })}
              formatter={value => (value != null ? Number(value).toLocaleString('ru-RU') : '')}
              parser={value => (value ? Number(String(value).replace(/\s/g, '')) : 0)}
            />
            <span className={styles.filtersModalAmountUnit}>₽</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
