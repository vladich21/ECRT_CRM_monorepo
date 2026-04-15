import { Button, Modal, Select } from 'antd';

import { PATENT_GRANT_REGION_OPTIONS } from '../../api/patents/patentGrantRegions';

import styles from './PatentsListPage.module.scss';
import type { PatentAdvancedFilters, PatentListFiltersSelectOptions } from './PatentsListPage.types';

type PatentFiltersModalProps = {
  open: boolean;
  draftFilters: PatentAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<PatentAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: PatentListFiltersSelectOptions;
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
          <span className={styles.filtersModalLabel}>Проект</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все проекты'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.projects}
            value={draftFilters.projectId ?? undefined}
            onChange={value => onUpdateDraftFilter({ projectId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Договор (работы по договору)</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все договоры'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.contracts}
            value={draftFilters.contractId ?? undefined}
            onChange={value => onUpdateDraftFilter({ contractId: value ?? null })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Страна / регион выдачи (Охранный документ)</span>
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            placeholder='Все'
            allowClear
            options={PATENT_GRANT_REGION_OPTIONS}
            value={(draftFilters.grantRegionKeys ?? []).length > 0 ? draftFilters.grantRegionKeys : undefined}
            onChange={value => onUpdateDraftFilter({ grantRegionKeys: value ?? [] })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Год регистрации (ИЦ ЖТ)</span>
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            placeholder='Все годы'
            allowClear
            options={selectOptions.calendarYears}
            value={
              (draftFilters.registrationYears ?? []).length > 0 ? draftFilters.registrationYears : undefined
            }
            onChange={value => onUpdateDraftFilter({ registrationYears: value ?? [] })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Год регистрации (ЦИР)</span>
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            placeholder='Все годы'
            allowClear
            options={selectOptions.calendarYears}
            value={
              (draftFilters.registrationCirYears ?? []).length > 0 ? draftFilters.registrationCirYears : undefined
            }
            onChange={value => onUpdateDraftFilter({ registrationCirYears: value ?? [] })}
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
          <span className={styles.filtersModalLabel}>Область применения</span>
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            placeholder='Все области'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.applicationAreas}
            value={(draftFilters.areaIds ?? []).length > 0 ? draftFilters.areaIds : undefined}
            onChange={value => onUpdateDraftFilter({ areaIds: value ?? [] })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Исполнители</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все исполнители'
            allowClear
            showSearch
            optionFilterProp='label'
            mode='multiple'
            options={selectOptions.users}
            value={draftFilters.authorIds ?? []}
            onChange={value => onUpdateDraftFilter({ authorIds: value ?? [] })}
          />
        </div>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Ответственный за патентование</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Все ответственные'
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
