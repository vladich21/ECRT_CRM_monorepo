import type { ReactNode } from 'react';
import { Button, Modal, Select, Typography } from 'antd';
import type { DefaultOptionType } from 'antd/es/select';

import type { SupplierEvaluationCategory } from '../../types/supplierEvaluation';
import {
  EVALUATION_CATEGORY_FILTER_OPTIONS,
  EVALUATION_REGISTRY_SORT_OPTIONS,
  EVALUATION_YEAR_MULTI_OPTIONS,
  type EvaluationRegistrySortPreset,
} from './supplierEvaluationsConstants';
import styles from './SupplierEvaluationsRegistryPage.module.scss';

const { Text } = Typography;

export type EvaluationsRegistryAppliedFilters = {
  evaluatedYears: string[];
  category: 'all' | SupplierEvaluationCategory;
  createdByUserIds: string[];
  projectIds: string[];
  sortPreset: EvaluationRegistrySortPreset;
};

export const EMPTY_EVALUATIONS_REGISTRY_FILTERS: EvaluationsRegistryAppliedFilters = {
  evaluatedYears: [],
  category: 'all',
  createdByUserIds: [],
  projectIds: [],
  sortPreset: 'evaluated_at_desc',
};

export function countActiveRegistryFilters(filters: EvaluationsRegistryAppliedFilters): number {
  let activeCount = 0;
  if (filters.evaluatedYears.length > 0) activeCount += 1;
  if (filters.category !== 'all') activeCount += 1;
  if (filters.createdByUserIds.length > 0) activeCount += 1;
  if (filters.projectIds.length > 0) activeCount += 1;
  return activeCount;
}

type BuyerOption = { value: string; label: string };

type Props = {
  open: boolean;
  draft: EvaluationsRegistryAppliedFilters;
  onUpdateDraft: (patch: Partial<EvaluationsRegistryAppliedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  projectOptions: BuyerOption[];
  buyerOptions: BuyerOption[];
  buyerOptionsLoading?: boolean;
};

export function SupplierEvaluationsRegistryFiltersModal({
  open,
  draft,
  onUpdateDraft,
  onClose,
  onApply,
  onReset,
  projectOptions,
  buyerOptions,
  buyerOptionsLoading = false,
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

  const filterBuyerOption = (searchText: string, option?: DefaultOptionType) => {
    const optionLabel = String(option?.label ?? '').toLowerCase();
    return optionLabel.includes(searchText.toLowerCase());
  };

  return (
    <Modal
      title='Фильтры оценок'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={760}
      destroyOnHidden
      footer={footer}
    >
      <div className={styles.evaluationsFiltersModalForm}>
        <div className={styles.evaluationsFiltersModalCompactRow}>
          <div className={styles.filtersModalField}>
            <span className={styles.filtersModalLabel}>Период оценки</span>
            <Select
              className={styles.filtersModalControl}
              mode='multiple'
              allowClear
              placeholder='Все периоды'
              maxTagCount='responsive'
              options={EVALUATION_YEAR_MULTI_OPTIONS}
              value={draft.evaluatedYears}
              onChange={value => onUpdateDraft({ evaluatedYears: value ?? [] })}
            />
          </div>
          <div className={styles.filtersModalField}>
            <span className={styles.filtersModalLabel}>Категория</span>
            <Select<'all' | SupplierEvaluationCategory>
              className={styles.filtersModalControl}
              options={EVALUATION_CATEGORY_FILTER_OPTIONS}
              value={draft.category}
              onChange={value => onUpdateDraft({ category: value })}
            />
          </div>
          <div className={styles.filtersModalField}>
            <span className={styles.filtersModalLabel}>Сортировка</span>
            <Select<EvaluationRegistrySortPreset>
              className={styles.filtersModalControl}
              options={EVALUATION_REGISTRY_SORT_OPTIONS}
              value={draft.sortPreset}
              onChange={value => onUpdateDraft({ sortPreset: value })}
            />
          </div>
        </div>
        <div className={`${styles.filtersModalField} ${styles.evaluationsFiltersModalFieldFull}`}>
          <span className={styles.filtersModalLabel}>Проект</span>
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            allowClear
            showSearch
            placeholder='Все проекты'
            optionFilterProp='label'
            maxTagCount='responsive'
            options={projectOptions}
            value={draft.projectIds}
            onChange={value => onUpdateDraft({ projectIds: value ?? [] })}
          />
        </div>
        <div className={`${styles.filtersModalField} ${styles.evaluationsFiltersModalFieldFull}`}>
          <span className={styles.filtersModalLabel}>Закупщик</span>
          
          <Select
            className={styles.filtersModalControl}
            mode='multiple'
            allowClear
            showSearch
            loading={buyerOptionsLoading}
            placeholder={
              buyerOptions.length === 0 && !buyerOptionsLoading ? 'Нет авторов в оценках' : 'Все'
            }
            optionFilterProp='label'
            maxTagCount='responsive'
            options={buyerOptions}
            filterOption={filterBuyerOption}
            value={draft.createdByUserIds}
            onChange={value => onUpdateDraft({ createdByUserIds: value ?? [] })}
          />
        </div>
      </div>
    </Modal>
  );
}
