import { Empty, Select } from 'antd';

import type { PartnerReportEvaluation, SupplierEvaluationCriterion } from '@/types/supplierEvaluation';
import { SupplierEvaluationScoreGuideTrigger } from './SupplierEvaluationScoreGuideTrigger';
import { formatEvaluatedAtRu } from './supplierEvaluationUi';
import { PartnerEvaluationReportMatrixCard } from './PartnerEvaluationReportMatrixCard';

import styles from './PartnerEvaluationReportContent.module.scss';

type Props = {
  criteria: SupplierEvaluationCriterion[];
  evalsDesc: PartnerReportEvaluation[];
  selectedEval: PartnerReportEvaluation | null;
  selectedEvalId: string | undefined;
  onSelectedEvalIdChange: (id: string) => void;
  scope: string;
  supplierName: string;
  inn: string;
  showComment?: boolean;
};

export function PartnerEvaluationReportMatrixSection({
  criteria,
  evalsDesc,
  selectedEval,
  selectedEvalId,
  onSelectedEvalIdChange,
  scope,
  supplierName,
  inn,
  showComment = scope !== 'all',
}: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.matrixToolbar} data-print-hide>
        <span className={styles.matrixPickLabel}>Оценка:</span>
        <Select
          value={selectedEvalId ?? selectedEval?.id}
          onChange={onSelectedEvalIdChange}
          className={styles.evalSelect}
          options={evalsDesc.map(e => ({
            value: e.id,
            label: `${formatEvaluatedAtRu(e.evaluated_at)}${scope === 'all' ? ` · ${e.project_label}` : ''}`,
          }))}
        />
        <SupplierEvaluationScoreGuideTrigger />
      </div>

      {selectedEval ? (
        <PartnerEvaluationReportMatrixCard
          evaluation={selectedEval}
          criteria={criteria}
          supplierName={supplierName}
          inn={inn}
          showComment={showComment}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Нет оценок в выбранном периоде' />
      )}
    </div>
  );
}
