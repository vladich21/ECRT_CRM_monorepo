import { Button, Modal, Select } from 'antd';

import { PATENT_GRANT_REGION_OPTIONS } from '../../../../api/patents/patentGrantRegions';
import {
  PATENT_GRANT_STATUS_FILTER_OPTIONS,
  type PatentGrantsRegistryAdvancedFilters,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';
import patentListStyles from '../../../patents/PatentsListPage.module.scss';

const CALENDAR_YEAR_START = 2022;
const CALENDAR_YEAR_END = 2050;

const CALENDAR_YEAR_OPTIONS: Array<{ label: string; value: number }> = (() => {
  const years: Array<{ label: string; value: number }> = [];
  for (let year = CALENDAR_YEAR_START; year <= CALENDAR_YEAR_END; year++) {
    years.push({ label: String(year), value: year });
  }
  return years;
})();

type Props = {
  open: boolean;
  draftFilters: PatentGrantsRegistryAdvancedFilters;
  onUpdateDraftFilter: (patch: Partial<PatentGrantsRegistryAdvancedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

export function PatentGrantsRegistryFiltersModal({
  open,
  draftFilters,
  onUpdateDraftFilter,
  onClose,
  onApply,
  onReset,
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
          <span className={patentListStyles.filtersModalLabel}>Год выдачи</span>
          <Select
            className={patentListStyles.filtersModalControl}
            mode='multiple'
            allowClear
            placeholder='Любой год'
            options={CALENDAR_YEAR_OPTIONS}
            value={draftFilters.grantIssueYears}
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
            options={CALENDAR_YEAR_OPTIONS}
            value={draftFilters.grantRenewalYears}
            onChange={value => onUpdateDraftFilter({ grantRenewalYears: value ?? [] })}
          />
        </div>
      </div>
    </Modal>
  );
}
