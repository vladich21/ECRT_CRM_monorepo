import { ReactNode } from 'react';
import { CalendarOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import { formatEvaluationScoreDisplay, scoreColor } from '../evaluations/supplierEvaluationUi';
import ComplianceCards, { type ComplianceItem } from './ComplianceCards';
import styles from './KpiRow.module.scss';

interface KpiRowProps {
  complianceItems: ComplianceItem[];
  supplierEvalAvgScore: number | null;
  nextEvaluationValue: ReactNode;
  avgScoreLabel?: string;
}

type KpiTileKey = 'avgScore' | 'nextEval';

interface KpiTile {
  key: KpiTileKey;
  icon: ReactNode;
  value: ReactNode;
  label: string;
}

export default function KpiRow({
  complianceItems,
  supplierEvalAvgScore,
  nextEvaluationValue,
  avgScoreLabel = 'Средняя оценка',
}: KpiRowProps) {
  const tiles: KpiTile[] = [
    {
      key: 'avgScore',
      icon: <SafetyCertificateOutlined />,
      value:
        supplierEvalAvgScore == null ? '-' : formatEvaluationScoreDisplay(supplierEvalAvgScore),
      label: avgScoreLabel,
    },
    {
      key: 'nextEval',
      icon: <CalendarOutlined />,
      value: nextEvaluationValue,
      label: 'Следующая оценка',
    },
  ];

  return (
    <div className={styles.row}>
      <div className={`${styles.tile} ${styles.tileWide}`}>
        <ComplianceCards items={complianceItems} compact embedded />
      </div>
      {tiles.map(kpi => (
        <div key={kpi.key} className={styles.tile}>
          <div className={styles.tileHeader}>{kpi.label}</div>
          <div className={styles.tileContent}>
            <div>
              <div
                className={styles.value}
                style={
                  kpi.key === 'avgScore'
                    ? {
                        color: supplierEvalAvgScore != null ? scoreColor(supplierEvalAvgScore) : '#8c8c8c',
                      }
                    : undefined
                }
              >
                {kpi.value}
              </div>
            </div>
            <div className={styles.iconBox}>{kpi.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
