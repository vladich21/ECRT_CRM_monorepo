import { useMemo } from 'react';
import { Select } from 'antd';

import { EvaluationReportPeriodFilter, type EvaluationReportPeriodFilterValue } from './EvaluationReportPeriodFilter';
import type { EvaluationDateBounds } from './partnerEvaluationReportModel';
import type { PartnerReportEvaluation } from '@/types/supplierEvaluation';
import { buildReportEvaluationSelectOptions } from './partnerEvaluationReportSelectLabels';
import { PartnerEvaluationReportEvalSelectLabel } from './PartnerEvaluationReportEvalSelectLabel';
import { SupplierEvaluationScoreGuideTrigger } from './SupplierEvaluationScoreGuideTrigger';

import styles from './PartnerEvaluationReportToolbar.module.scss';

const SELECT_POPUP_CLASS = { popup: { root: styles.selectDropdown } };

type ProjectOption = {
  value: string;
  label: string;
};

type Props = {
  periodFilter: EvaluationReportPeriodFilterValue;
  onPeriodFilterChange: (value: EvaluationReportPeriodFilterValue) => void;
  evaluationDateBounds: EvaluationDateBounds | null;
  scope: string;
  onScopeChange: (value: string) => void;
  projectOptions: ProjectOption[];
  showProjectSelect: boolean;
  showMatrixControls?: boolean;
  evalsDesc?: PartnerReportEvaluation[];
  selectedEvalId?: string;
  onSelectedEvalIdChange?: (id: string) => void;
};

export function PartnerEvaluationReportToolbar({
  periodFilter,
  onPeriodFilterChange,
  evaluationDateBounds,
  scope,
  onScopeChange,
  projectOptions,
  showProjectSelect,
  showMatrixControls = false,
  evalsDesc = [],
  selectedEvalId,
  onSelectedEvalIdChange,
}: Props) {
  const evalOptions = useMemo(
    () => buildReportEvaluationSelectOptions(evalsDesc, scope),
    [evalsDesc, scope],
  );

  const projectSelectOptions = useMemo(
    () => projectOptions.map(option => ({ ...option, title: option.label })),
    [projectOptions],
  );

  const projectSelect = showProjectSelect ? (
    <Select
      value={scope}
      onChange={onScopeChange}
      options={projectSelectOptions}
      className={styles.projectSelect}
      popupMatchSelectWidth={false}
      classNames={SELECT_POPUP_CLASS}
    />
  ) : null;

  if (showMatrixControls) {
    return (
      <div className={styles.rootSplit} data-print-hide>
        <div className={styles.leftGroup}>
          <SupplierEvaluationScoreGuideTrigger />
        </div>
        <div className={styles.filtersGroup}>
          <span className={styles.matrixPickLabel}>Оценка:</span>
          <Select
            value={selectedEvalId}
            onChange={onSelectedEvalIdChange}
            options={evalOptions}
            optionRender={option => {
              const item = evalOptions.find(entry => entry.value === option.value);
              return item ? <PartnerEvaluationReportEvalSelectLabel option={item} /> : option.label;
            }}
            labelRender={({ value }) => {
              const item = evalOptions.find(entry => entry.value === value);
              return item ? (
                <PartnerEvaluationReportEvalSelectLabel option={item} variant='selected' />
              ) : (
                value
              );
            }}
            className={styles.evalSelect}
            popupMatchSelectWidth={false}
            classNames={SELECT_POPUP_CLASS}
            suffixIcon={null}
          />
          {projectSelect}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.rootSplit} data-print-hide>
      <div className={styles.leftGroup}>
        <SupplierEvaluationScoreGuideTrigger />
      </div>
      <div className={styles.filtersGroup}>
        <EvaluationReportPeriodFilter
          value={periodFilter}
          onChange={onPeriodFilterChange}
          evaluationDateBounds={evaluationDateBounds}
        />
        {projectSelect}
      </div>
    </div>
  );
}
