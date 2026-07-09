import type { ReportEvaluationSelectOption } from './partnerEvaluationReportSelectLabels';

import styles from './PartnerEvaluationReportToolbar.module.scss';

type Props = {
  option: ReportEvaluationSelectOption;
  variant?: 'dropdown' | 'selected';
};

export function PartnerEvaluationReportEvalSelectLabel({
  option,
  variant = 'dropdown',
}: Props) {
  return (
    <div className={variant === 'selected' ? styles.evalSelected : styles.evalOption}>
      <div className={styles.evalOptionMain}>
        <span className={styles.evalOptionDate}>{option.dateLabel}</span>
        <span className={styles.evalOptionQuarter}>{option.quarterLabel}</span>
      </div>
      {option.projectLabel ? (
        <span className={styles.evalOptionProject}>{option.projectLabel}</span>
      ) : null}
    </div>
  );
}
