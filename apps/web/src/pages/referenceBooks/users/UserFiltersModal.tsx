import type { ReactNode } from 'react';
import { Button, DatePicker, Modal, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import styles from './UsersListPage.module.scss';
export type UserFilters = {
  departmentId: string | null;
  positionId: string | null;
  roleId: string | null;
  createdAtRange: [Dayjs, Dayjs] | null;
};
export const EMPTY_USER_FILTERS: UserFilters = {
  departmentId: null,
  positionId: null,
  roleId: null,
  createdAtRange: null,
};
type SelectOption = {
  label: string;
  value: string;
};
type Props = {
  open: boolean;
  draftFilters: UserFilters;
  onUpdateDraftFilter: (patch: Partial<UserFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: {
    departments: SelectOption[];
    positions: SelectOption[];
    roles: SelectOption[];
  };
};
const { RangePicker } = DatePicker;
function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.filtersModalField}>
      <span className={styles.filtersModalLabel}>{label}</span>
      {children}
    </div>
  );
}
export function UserFiltersModal({
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
      title='Фильтры пользователей'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={640}
      destroyOnClose
      footer={footer}
    >
      <div className={styles.filtersModalGrid}>
        <FilterField label='Отдел'>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все отделы'
            allowClear
            options={selectOptions.departments}
            value={draftFilters.departmentId}
            onChange={value => onUpdateDraftFilter({ departmentId: value ?? null })}
          />
        </FilterField>

        <FilterField label='Должность'>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все должности'
            allowClear
            options={selectOptions.positions}
            value={draftFilters.positionId}
            onChange={value => onUpdateDraftFilter({ positionId: value ?? null })}
          />
        </FilterField>

        <FilterField label='Роль'>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все роли'
            allowClear
            options={selectOptions.roles}
            value={draftFilters.roleId}
            onChange={value => onUpdateDraftFilter({ roleId: value ?? null })}
          />
        </FilterField>

        <FilterField label='Дата регистрации'>
          <RangePicker
            className={styles.filtersModalControl}
            value={draftFilters.createdAtRange}
            onChange={dates =>
              onUpdateDraftFilter({
                createdAtRange: dates && dates[0] && dates[1] ? [dates[0], dates[1]] : null,
              })
            }
            format='DD.MM.YYYY'
          />
        </FilterField>
      </div>
    </Modal>
  );
}
