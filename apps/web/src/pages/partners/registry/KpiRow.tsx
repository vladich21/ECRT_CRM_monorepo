import { ReactNode } from 'react';
import { BarChartOutlined, CalendarOutlined, FileTextOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

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
}
export default function KpiRow({ contractsCount, totalVolume, complianceScore, nextAuditDate }: KpiRowProps) {
  const tiles: KpiTile[] = [
    { icon: <FileTextOutlined />, value: contractsCount, label: 'Договоров' },
    { icon: <BarChartOutlined />, value: totalVolume, label: 'Общий объём' },
    { icon: <SafetyCertificateOutlined />, value: (complianceScore / 20).toFixed(2), label: 'Оценка' },
    { icon: <CalendarOutlined />, value: nextAuditDate || '—', label: 'След. оценка' },
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
            <div className={styles.iconBox}>{kpi.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
