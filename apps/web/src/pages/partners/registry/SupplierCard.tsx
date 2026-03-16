import { Tag } from 'antd';
import { Progress } from 'antd';
import {
  EnvironmentOutlined,
  RightOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import type { Partner } from '../../../types/partner';
import styles from './SupplierCard.module.scss';

interface SupplierCardProps {
  partner: Partner;
  references?: {
    partnerStatuses?: Array<{ id: string; name: string }>;
    partnerTypes?: Array<{ id: string; name: string }>;
    competencies?: Array<{ id: string; name: string; color_bg?: string; color_text?: string; color_border?: string }>;
  };
  onClick: (partner: Partner) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Активный': '#52c41a',
  'Потенциальный': '#1677ff',
  'Заблокирован': '#ff4d4f',
  'Архив': '#8c8c8c',
};

export default function SupplierCard({ partner, references, onClick }: SupplierCardProps) {
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name ?? '—';
  const statusColor = STATUS_COLORS[statusName] ?? '#1677ff';
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);
  return (
    <div
      className={styles.card}
      style={{ '--status-color': statusColor } as React.CSSProperties}
      onClick={() => onClick(partner)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{partner.short_name || partner.name}</span>
          <span className={styles.metaInn}>
            <BankOutlined style={{ fontSize: 11, marginRight: 4 }} />
            ИНН {partner.inn || '—'}
          </span>
        </div>
        <div className={styles.metaRow}>
          <Tag color={statusColor} style={{ fontSize: 14 }}>{statusName}</Tag>
        </div>
        {typeNames.length > 0 && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span>{typeNames.join(', ')}</span>
          </div>
        )}
        {partner.actual_address && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span className={styles.metaCity}>
              <EnvironmentOutlined style={{ fontSize: 11 }} />
              {partner.actual_address}
            </span>
          </div>
        )}
      </div>

      <div className={styles.metricsCol}>
        <div className={styles.complianceBlock}>
          <div className={styles.complianceHeader}>
            <span className={styles.complianceLabel}><SafetyCertificateOutlined /> Оценка</span>
            <span className={styles.complianceScore} style={{ color: '#ff4d4f' }}>0.00</span>
          </div>
          <Progress percent={0} showInfo={false} size="small" strokeColor="#ff4d4f" trailColor="#f0f0f0" />
        </div>
        <div className={styles.contractsCount}>
          <CalendarOutlined />
          След. оценка: —
        </div>
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
