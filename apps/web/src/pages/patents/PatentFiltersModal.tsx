import { Button, Modal, Select } from 'antd';

import styles from './PatentsListPage.module.scss';
import type { PatentAdvancedFilters } from './PatentsListPage.types';

type SelectOption = {
  label: string;
  value: string;
};
type PatentFiltersModalProps = {
  open: boolean;
  draftFilters: PatentAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<PatentAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: {
    departments: SelectOption[];
    statuses: SelectOption[];
    users: SelectOption[];
  };
};
export function PatentFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
  selectOptions,
}: PatentFiltersModalProps) {
  return (
    <Modal
      title='Фильтры РИД'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      okText='Применить'
      cancelText='Отмена'
      width={640}
      destroyOnHidden
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
          <span className={styles.filtersModalLabel}>Подразделение</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все подразделения'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.departments}
            value={draftFilters.departmentId ?? undefined}
            onChange={value => onUpdateDraftFilter({ departmentId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Состояние</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все состояния'
            allowClear
            options={selectOptions.statuses}
            value={draftFilters.statusId ?? undefined}
            onChange={value => onUpdateDraftFilter({ statusId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Авторы (Исполнители)</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все авторы'
            allowClear
            showSearch
            optionFilterProp='label'
            mode='multiple'
            options={selectOptions.users}
            value={draftFilters.authorIds}
            onChange={value => onUpdateDraftFilter({ authorIds: value ?? [] })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Ответственный</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все сотрудники'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.users}
            value={draftFilters.responsibleId ?? undefined}
            onChange={value => onUpdateDraftFilter({ responsibleId: value ?? null })}
          />
        </div>
      </div>
    </Modal>
  );
}
