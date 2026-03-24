import {
  AimOutlined,
  ArrowLeftOutlined,
  BellOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  InboxOutlined,
  StarFilled,
  StopFilled,
} from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import type { PartnerDetailExtras, PartnerRegistryStatus } from '../../../types/partnerRegistry';
import { STATUS_CONFIG, TYPE_CONFIG } from '../partnerRegistryConfig';
import styles from './DetailHeader.module.scss';

const STATUS_ICONS: Record<PartnerRegistryStatus, React.ReactNode> = {
  active: <CheckCircleFilled />,
  potential: <ClockCircleFilled />,
  blocked: <StopFilled />,
  archive: <InboxOutlined />,
};
interface TabItem {
  key: string;
  label: string;
}
interface DetailHeaderProps {
  name: string;
  extras: PartnerDetailExtras;
  activeTab: string;
  tabs: TabItem[];
  onTabChange: (key: string) => void;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
export default function DetailHeader({
  name,
  extras,
  activeTab,
  tabs,
  onTabChange,
  onBack,
  onEdit,
  onDelete,
}: DetailHeaderProps) {
  const st = STATUS_CONFIG[extras.status];
  const tp = TYPE_CONFIG[extras.type];
  return (
    <div className={styles.header}>
      <Button type='text' icon={<ArrowLeftOutlined />} onClick={onBack} className={styles.backBtn}>
        Реестр контрагентов
      </Button>

      <div className={styles.companyRow}>
        <div className={styles.companyInfo}>
          <div className={styles.nameRow}>
            <h1 className={styles.companyName}>{name}</h1>
            {extras.key_supplier && (
              <Tooltip title='Ключевой поставщик'>
                <div className={styles.badgeKey}>
                  <StarFilled style={{ fontSize: 12 }} />
                  Ключевой
                </div>
              </Tooltip>
            )}
            {extras.targeted && (
              <Tooltip title='Целевой поставщик'>
                <div className={styles.badgeTarget}>
                  <AimOutlined style={{ fontSize: 12 }} />
                  Целевой
                </div>
              </Tooltip>
            )}
          </div>

          <div className={styles.metaRow}>
            <div
              className={styles.statusBadge}
              style={{
                background: `${st.color}20`,
                border: `1px solid ${st.color}50`,
                color: st.color,
              }}
            >
              {STATUS_ICONS[extras.status]} {st.label}
            </div>
            <span className={styles.metaInn}>ИНН {extras.city ? '' : ''}</span>
            <span className={styles.metaType}>{tp.label}</span>
            <span className={styles.metaCity}>
              <EnvironmentOutlined />
              {extras.city}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <Button icon={<BellOutlined />} className={styles.actionBtn} />
          <Button type='primary' icon={<EditOutlined />} onClick={onEdit}>
            Редактировать
          </Button>
          <Button type='primary' danger icon={<DeleteOutlined />} onClick={onDelete}>
            Удалить
          </Button>
        </div>
      </div>

      <div className={styles.tabs}>
        {tabs.map(tab => (
          <div
            key={tab.key}
            className={activeTab === tab.key ? styles.tabActive : styles.tab}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </div>
        ))}
      </div>
    </div>
  );
}
