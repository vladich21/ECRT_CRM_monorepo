import { ReactNode } from 'react';
import {
  FileTextOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
const complianceColor = (score: number) => {
  if (score >= 80) return '#52c41a';
  if (score >= 50) return '#faad14';
  return '#db221f';
};
import styles from './KpiRow.module.scss';

interface KpiRowProps {
  contractsCount: number;
  totalVolume: string;
  complianceScore: number;
  nextAuditDate?: string;
}

interface KpiTile {
  icon: ReactNode;
  value: string | number;
  label: string;
  color: string;
}

export default function KpiRow({ contractsCount, totalVolume, complianceScore, nextAuditDate }: KpiRowProps) {
  const tiles: KpiTile[] = [
    { icon: <FileTextOutlined />, value: contractsCount, label: 'Договоров', color: '#1677ff' },
    { icon: <BarChartOutlined />, value: totalVolume, label: 'Общий объём', color: '#13c2c2' },
    { icon: <SafetyCertificateOutlined />, value: (complianceScore / 20).toFixed(2), label: 'Оценка', color: complianceColor(complianceScore) },
    { icon: <CalendarOutlined />, value: nextAuditDate || '—', label: 'След. оценка', color: '#722ed1' },
  ];

  return (
    <div className={styles.row}>
      {tiles.map((kpi, i) => (
        <div key={i} className={styles.tile}>
          <div className={styles.tileContent}>
            <div>
              <div className={styles.value}>{kpi.value}</div>
              <div className={styles.label}>{kpi.label}</div>
            </div>
            <div
              className={styles.iconBox}
              style={{ background: `${kpi.color}15`, color: kpi.color }}
            >
              {kpi.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
