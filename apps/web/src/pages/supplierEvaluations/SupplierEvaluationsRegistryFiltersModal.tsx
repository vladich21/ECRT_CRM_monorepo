import type { ReactNode } from 'react';
import { Button, Modal, Select } from 'antd';

import type { SupplierEvaluationCategory } from '../../types/supplierEvaluation';
import {
  EVALUATION_CATEGORY_FILTER_OPTIONS,
  EVALUATION_REGISTRY_SORT_OPTIONS,
  EVALUATION_YEAR_FILTER_ALL,
  EVALUATION_YEAR_OPTIONS,
  type EvaluationRegistrySortPreset,
} from './supplierEvaluationsConstants';
import styles from './SupplierEvaluationsRegistryPage.module.scss';

export type EvaluationsRegistryAppliedFilters = {
  evaluatedYear: string;
  category: 'all' | SupplierEvaluationCategory;
  createdByUserId: string | undefined;
  sortPreset: EvaluationRegistrySortPreset;
};

export const EMPTY_EVALUATIONS_REGISTRY_FILTERS: EvaluationsRegistryAppliedFilters = {
  evaluatedYear: EVALUATION_YEAR_FILTER_ALL,
  category: 'all',
  createdByUserId: undefined,
  sortPreset: 'evaluated_at_desc',
};

type BuyerOption = { value: string; label: string };

type Props = {
  open: boolean;
  draft: EvaluationsRegistryAppliedFilters;
  onUpdateDraft: (patch: Partial<EvaluationsRegistryAppliedFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
  buyerOptions: BuyerOption[];
};

export function SupplierEvaluationsRegistryFiltersModal({
  open,
  draft,
  onUpdateDraft,
  onClose,
  onApply,
  onReset,
  buyerOptions,
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
      title='Фильтры оценок'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={720}
      destroyOnHidden
      footer={footer}
    >
      <div className={styles.filtersModalGrid}>
        <div className={styles.filtersModalField}>
          <span className={styles.filtersModalLabel}>Период оценки</span>
          <Select
            className={styles.filtersModalControl}
            placeholder='Период'
            options={EVALUATION_YEAR_OPTIONS}
            value={draft.evaluatedYear}
            onChange={value => onUpdateDraft({ evaluatedYear: value })}
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
          <span className={styles.filtersModalLabel}>Закупщик</span>
          <Select
            className={styles.filtersModalControl}
            allowClear
            showSearch
            placeholder='Все закупщики'
            optionFilterProp='label'
            options={buyerOptions}
            value={draft.createdByUserId}
            onChange={value => onUpdateDraft({ createdByUserId: value })}
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
    </Modal>
  );
}
