import { Alert } from 'antd';

import type { PartnerReportEvaluation, SupplierEvaluationCriterion } from '@/types/supplierEvaluation';
import { formatSupplierEvaluationCommentForDisplay } from './supplierEvaluationCommentDisplay';
import { evaluationHasLowScore } from './partnerEvaluationReportModel';
import { formatEvaluatedAtWithQuarter } from './evaluationReportQuarterUtils';
import {
  CategoryTag,
  categoryFromWeightedScore,
  formatEvaluationScoreDisplay,
  scoreColor,
  weightPercent,
} from './supplierEvaluationUi';

import styles from './PartnerEvaluationReportContent.module.scss';

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{value}</span>
    </div>
  );
}

type Props = {
  evaluation: PartnerReportEvaluation;
  criteria: SupplierEvaluationCriterion[];
  supplierName: string;
  inn: string;
  showComment?: boolean;
};

export function PartnerEvaluationReportMatrixCard({
  evaluation,
  criteria,
  supplierName,
  inn,
  showComment = true,
}: Props) {
  const displayComment = formatSupplierEvaluationCommentForDisplay(evaluation.comment);
  const shouldShowComment = showComment && evaluationHasLowScore(evaluation) && Boolean(displayComment);

  return (
    <div className={styles.card}>
      <div className={styles.matrixHead}>
        <ReportField label='Поставщик' value={supplierName} />
        <ReportField label='ИНН' value={inn} />
        <div className={`${styles.field} ${styles.fieldProject}`}>
          <span className={styles.fieldLabel}>Проект</span>
          <span className={styles.fieldValue}>{evaluation.project_label}</span>
        </div>
        <ReportField label='Дата оценки' value={formatEvaluatedAtWithQuarter(evaluation.evaluated_at)} />
      </div>
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th>Критерий</th>
            <th className={styles.matrixNum}>Вес %</th>
            <th className={styles.matrixNum}>Балл</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map(criterion => {
            const score = evaluation.scores.find(s => s.criterion_code === criterion.code)?.score;
            return (
              <tr key={criterion.id}>
                <td>{criterion.name}</td>
                <td className={styles.matrixNum}>{weightPercent(criterion.weight)}</td>
                <td className={styles.matrixNum} style={{ color: score != null ? scoreColor(score) : undefined }}>
                  {score != null ? formatEvaluationScoreDisplay(score) : '-'}
                </td>
              </tr>
            );
          })}
          <tr className={styles.matrixTotal}>
            <td>Итоговая оценка</td>
            <td className={styles.matrixNum} />
            <td className={styles.matrixNum}>{formatEvaluationScoreDisplay(evaluation.weighted_score)}</td>
          </tr>
          <tr className={styles.matrixTotal}>
            <td>Категория поставщика</td>
            <td className={styles.matrixNum} />
            <td className={styles.matrixNum}>
              <CategoryTag
                category={evaluation.category ?? categoryFromWeightedScore(evaluation.weighted_score)}
                weightedScore={evaluation.weighted_score}
              />
            </td>
          </tr>
        </tbody>
      </table>

      {shouldShowComment ? (
        <Alert
          type='warning'
          showIcon
          className={styles.matrixComment}
          message='Комментарий к оценке (несоответствия и принятые меры)'
          description={displayComment}
        />
      ) : null}
    </div>
  );
}
