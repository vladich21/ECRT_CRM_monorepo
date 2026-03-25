import type { ReactNode } from 'react';
import { Button, DatePicker, Modal, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import type { SupplierEvaluationCategory } from '../../../types/supplierEvaluation';
import { EVALUATION_CATEGORY_FILTER_OPTIONS } from '../../supplierEvaluations/supplierEvaluationsConstants';
import listStyles from '../../supplierEvaluations/EvaluationsListShared.module.scss';

export type PartnerEvaluationsListFilters = {
  evaluatedAtRange: [Dayjs | null, Dayjs | null] | null;
  category: 'all' | SupplierEvaluationCategory;
  createdByUserId: string | undefined;
};

export const EMPTY_PARTNER_EVALUATIONS_LIST_FILTERS: PartnerEvaluationsListFilters = {
  evaluatedAtRange: null,
  category: 'all',
  createdByUserId: undefined,
};

export function countActivePartnerEvaluationsFilters(f: PartnerEvaluationsListFilters): number {
  const hasRange = Boolean(f.evaluatedAtRange?.[0] || f.evaluatedAtRange?.[1]);
  return [hasRange, f.category !== 'all', Boolean(f.createdByUserId)].filter(Boolean).length;
}

type BuyerOption = { value: string; label: string };

type RangePreset = { label: string; value: [Dayjs, Dayjs] };

type Props = {
  open: boolean;
  draft: PartnerEvaluationsListFilters;
  onUpdateDraft: (patch: Partial<PartnerEvaluationsListFilters>) => void;
  onClose: () => void;
  onApply: () => void;
  onResetDraft: () => void;
  buyerOptions: BuyerOption[];
  rangePresets: RangePreset[];
};

export function PartnerEvaluationsFiltersModal({
  open,
  draft,
  onUpdateDraft,
  onClose,
  onApply,
  onResetDraft,
  buyerOptions,
  rangePresets,
}: Props) {
  const footer: ReactNode[] = [
    <Button key='reset' onClick={onResetDraft}>
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
      title='Фильтры'
      open={open}
      onCancel={onClose}
      onOk={onApply}
      width={640}
      destroyOnHidden
      footer={footer}
    >
      <div className={listStyles.filtersModalGrid}>
        <div className={listStyles.filtersModalField} style={{ gridColumn: '1 / -1' }}>
          <span className={listStyles.filtersModalLabel}>Дата оценки</span>
          <DatePicker.RangePicker
            allowClear
            allowEmpty={[true, true]}
            format='DD.MM.YYYY'
            placeholder={['С', 'По']}
            value={draft.evaluatedAtRange}
            onChange={dates => onUpdateDraft({ evaluatedAtRange: dates ?? null })}
            presets={rangePresets}
            style={{ width: '100%' }}
          />
        </div>
        <div className={listStyles.filtersModalField}>
          <span className={listStyles.filtersModalLabel}>Категория</span>
          <Select<'all' | SupplierEvaluationCategory>
            className={listStyles.filtersModalControl}
            options={EVALUATION_CATEGORY_FILTER_OPTIONS}
            value={draft.category}
            onChange={value => onUpdateDraft({ category: value })}
          />
        </div>
        <div className={listStyles.filtersModalField}>
          <span className={listStyles.filtersModalLabel}>Закупщик</span>
          <Select
            className={listStyles.filtersModalControl}
            allowClear
            showSearch
            placeholder='Все закупщики'
            optionFilterProp='label'
            options={buyerOptions}
            value={draft.createdByUserId}
            onChange={value => onUpdateDraft({ createdByUserId: value })}
          />
        </div>
      </div>
    </Modal>
  );
}
