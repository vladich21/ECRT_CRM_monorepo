import type { PartnerReportEvaluation } from '@/types/supplierEvaluation';

import {
  CategoryTag,
  categoryFromWeightedScore,
  formatEvaluationScoreDisplay,
  scoreColor,
} from './supplierEvaluationUi';

import styles from './PartnerEvaluationReportContent.module.scss';

type Props = {
  value: number;
  category: PartnerReportEvaluation['category'];
};

export function PartnerEvaluationReportGauge({ value, category }: Props) {
  const pct = Math.min(100, Math.max(0, (value / 5) * 100));
  const color = scoreColor(value);

  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeValue} style={{ color }}>
        {formatEvaluationScoreDisplay(value)}
      </div>
      <CategoryTag category={category ?? categoryFromWeightedScore(value)} weightedScore={value} />
      <div className={styles.gaugeTrack}>
        <span className={styles.gaugeZoneD} />
        <span className={styles.gaugeZoneC} />
        <span className={styles.gaugeZoneB} />
        <span className={styles.gaugeZoneA} />
        <span className={styles.gaugeFill} style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className={styles.gaugeScale}>
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}
