import { Button, Modal, Select } from 'antd';

import { PATENT_GRANT_REGION_OPTIONS } from '../../../../api/patents/patentGrantRegions';
import {
  PATENT_GRANT_STATUS_FILTER_OPTIONS,
  type PatentGrantsRegistryAdvancedFilters,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';
import type { PatentListFiltersSelectOptions } from '../../../patents/types/PatentsListPage.types';
import patentListStyles from '../../../patents/PatentsListPage.module.scss';

type Props = {
  open: boolean;
  draftFilters: PatentGrantsRegistryAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<PatentGrantsRegistryAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  selectOptions: PatentListFiltersSelectOptions;
};

export function PatentGrantsRegistryFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
  selectOptions,
}: Props) {
  return (
    <Modal
      title='Фильтры охранных документов'
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
      <div className={patentListStyles.filtersModalGrid}>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Подразделение</span>
          <Select
            className={patentListStyles.filtersModalControl}
            placeholder='Все подразделения'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.departments}
            value={draftFilters.departmentId ?? undefined}
            onChange={value => onUpdateDraftFilter({ departmentId: value ?? null })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Проект</span>
          <Select
            className={patentListStyles.filtersModalControl}
            placeholder='Все проекты'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.projects}
            value={draftFilters.projectId ?? undefined}
            onChange={value => onUpdateDraftFilter({ projectId: value ?? null })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Договор (работы по договору)</span>
          <Select
            className={patentListStyles.filtersModalControl}
            placeholder='Все договоры'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.contracts}
            value={draftFilters.contractId ?? undefined}
            onChange={value => onUpdateDraftFilter({ contractId: value ?? null })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Статус охранного документа</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            allowClear
            placeholder='Все статусы'
            options={PATENT_GRANT_STATUS_FILTER_OPTIONS}
            value={draftFilters.grantStatuses}
            onChange={value => onUpdateDraftFilter({ grantStatuses: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Регион выдачи (ведомство)</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            allowClear
            placeholder='Все регионы'
            options={PATENT_GRANT_REGION_OPTIONS}
            value={draftFilters.grantRegionKeys}
            onChange={value => onUpdateDraftFilter({ grantRegionKeys: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Год регистрации (ИЦ ЖТ)</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            placeholder='Все годы'
            allowClear
            options={selectOptions.calendarYears}
            value={
              draftFilters.registrationYears.length > 0 ? draftFilters.registrationYears : undefined
            }
            onChange={value => onUpdateDraftFilter({ registrationYears: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Год регистрации (ЦИР)</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            placeholder='Все годы'
            allowClear
            options={selectOptions.calendarYears}
            value={
              draftFilters.registrationCirYears.length > 0 ? draftFilters.registrationCirYears : undefined
            }
            onChange={value => onUpdateDraftFilter({ registrationCirYears: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Год выдачи</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            allowClear
            placeholder='Любой год'
            options={selectOptions.calendarYears}
            value={draftFilters.grantIssueYears.length > 0 ? draftFilters.grantIssueYears : undefined}
            onChange={value => onUpdateDraftFilter({ grantIssueYears: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Год продления</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            allowClear
            placeholder='Любой год'
            options={selectOptions.calendarYears}
            value={draftFilters.grantRenewalYears.length > 0 ? draftFilters.grantRenewalYears : undefined}
            onChange={value => onUpdateDraftFilter({ grantRenewalYears: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Состояние РИД</span>
          <Select
            className={patentListStyles.filtersModalControl}
            placeholder='Все состояния'
            allowClear
            options={selectOptions.statuses}
            value={draftFilters.statusId ?? undefined}
            onChange={value => onUpdateDraftFilter({ statusId: value ?? null })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Область применения</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            placeholder='Все области'
            allowClear
            showSearch
            optionFilterProp='label'
            options={selectOptions.applicationAreas}
            value={draftFilters.areaIds.length > 0 ? draftFilters.areaIds : undefined}
            onChange={value => onUpdateDraftFilter({ areaIds: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Исполнители</span>
          <Select
            className={patentListStyles.filtersModalControl}
            placeholder='Все исполнители'
            allowClear
            showSearch
            optionFilterProp='label'
            mode='multiple'
            options={selectOptions.users}
            value={draftFilters.authorIds}
            onChange={value => onUpdateDraftFilter({ authorIds: value ?? [] })}
          />
        </div>
        <div className={patentListStyles.filtersModalField}>
          <span className={patentListStyles.filtersModalLabel}>Ответственный за патентование</span>
          <Select
            className={patentListStyles.filtersModalControl}
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
