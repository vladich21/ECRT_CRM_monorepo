import { Empty } from 'antd';

import type { PartnerReportEvaluation, SupplierEvaluationCriterion } from '@/types/supplierEvaluation';
import { PartnerEvaluationReportMatrixCard } from './PartnerEvaluationReportMatrixCard';

import styles from './PartnerEvaluationReportContent.module.scss';

type Props = {
  criteria: SupplierEvaluationCriterion[];
  selectedEval: PartnerReportEvaluation | null;
  supplierName: string;
  inn: string;
  showComment?: boolean;
};

export function PartnerEvaluationReportMatrixSection({
  criteria,
  selectedEval,
  supplierName,
  inn,
  showComment = false,
}: Props) {
  return (
    <div className={styles.section}>
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
