import { Select } from 'antd';

import { EvaluationReportPeriodFilter, type EvaluationReportPeriodFilterValue } from './EvaluationReportPeriodFilter';
import type { EvaluationDateBounds } from './partnerEvaluationReportModel';

import styles from './PartnerEvaluationReportToolbar.module.scss';

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
};

export function PartnerEvaluationReportToolbar({
  periodFilter,
  onPeriodFilterChange,
  evaluationDateBounds,
  scope,
  onScopeChange,
  projectOptions,
  showProjectSelect,
}: Props) {
  return (
    <div className={styles.root} data-print-hide>
      <EvaluationReportPeriodFilter
        value={periodFilter}
        onChange={onPeriodFilterChange}
        evaluationDateBounds={evaluationDateBounds}
      />
      {showProjectSelect ? (
        <Select
          value={scope}
          onChange={onScopeChange}
          options={projectOptions}
          className={styles.projectSelect}
        />
      ) : null}
    </div>
  );
}
