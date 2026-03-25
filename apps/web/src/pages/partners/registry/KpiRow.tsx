import { ReactNode } from 'react';
import { BarChartOutlined, CalendarOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

import { scoreColor } from '../evaluations/supplierEvaluationUi';
import styles from './KpiRow.module.scss';

interface KpiRowProps {
  /** Число договоров партнёра (как на вкладке «Договоры»); пока грузится — undefined → «—». */
  contractsCount?: number;
  totalVolume: string;
  /** Средний балл по актуальным оценкам проектов (шкала как в матрице); null — нет актуальных оценок. */
  supplierEvalAvgScore: number | null;
  /** Ближайшая next_reevaluation_date среди актуальных оценок; форматирование снаружи. */
  nextEvaluationValue: ReactNode;
  /** Жёлтая рамка плитки «Следующая оценка», если до срока переоценки ≤ окна «скоро». */
  nextEvaluationSoon?: boolean;
}
type KpiTileKey = 'contracts' | 'volume' | 'avgScore' | 'nextEval';

interface KpiTile {
  key: KpiTileKey;
  icon: ReactNode;
  value: ReactNode;
  label: string;
}

export default function KpiRow({
  contractsCount,
  totalVolume,
  supplierEvalAvgScore,
  nextEvaluationValue,
  nextEvaluationSoon,
}: KpiRowProps) {
  const tiles: KpiTile[] = [
    {
      key: 'contracts',
      icon: <FileTextOutlined />,
      value: contractsCount === undefined ? '—' : contractsCount,
      label: 'Договоров',
    },
    { key: 'volume', icon: <BarChartOutlined />, value: totalVolume, label: 'Общий объём' },
    {
      key: 'avgScore',
      icon: <SafetyCertificateOutlined />,
      value: supplierEvalAvgScore == null ? '—' : supplierEvalAvgScore.toFixed(2),
      label: 'Средняя оценка',
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
      {tiles.map(kpi => (
        <div
          key={kpi.key}
          className={`${styles.tile} ${kpi.key === 'nextEval' && nextEvaluationSoon ? styles.tileSoonReevaluation : ''}`}
        >
          <div className={styles.tileContent}>
            <div>
              <div
                className={styles.value}
                style={
                  kpi.key === 'avgScore'
                    ? {
                        color:
                          supplierEvalAvgScore != null ? scoreColor(supplierEvalAvgScore) : '#8c8c8c',
                      }
                    : undefined
                }
              >
                {kpi.value}
              </div>
              <div className={styles.label}>{kpi.label}</div>
            </div>
            <div className={styles.iconBox}>{kpi.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
