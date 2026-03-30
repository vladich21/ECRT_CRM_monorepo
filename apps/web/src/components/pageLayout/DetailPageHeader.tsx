import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import type { DetailStatusBadge } from './detailHeaderStatusBadge';
import { detailHeaderStatusBadgeClass } from './detailHeaderStatusBadge';

import styles from './DetailPageHeader.module.scss';

export type { DetailHeaderStatusBadgeVariant, DetailStatusBadge } from './detailHeaderStatusBadge';
export {
  PARTNER_STATUS_ID_TO_VARIANT,
  detailHeaderStatusBadgeClass,
  detailHeaderVariantForContractHeader,
  detailHeaderVariantForPartnerStatus,
  detailHeaderVariantForPartnerStatusName,
  detailHeaderVariantForPatentRecord,
  detailHeaderVariantForProjectStatus,
} from './detailHeaderStatusBadge';

interface TabItem {
  key: string;
  label: ReactNode;
}

interface DetailPageHeaderProps {
  title: string;
  titleSuffix?: ReactNode;
  subtitle?: ReactNode;
  backLabel: string;
  onBack: () => void;
  statusBadge?: DetailStatusBadge;
  metaItems?: ReactNode[];
  badges?: ReactNode[];
  actions?: ReactNode;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  extraContent?: ReactNode;
  stickyHeader?: boolean;
  children?: ReactNode;
  contextHolder?: ReactNode;
  titleWeight?: 'default' | 'medium';
}
export default function DetailPageHeader({
  title,
  titleSuffix,
  subtitle,
  backLabel,
  onBack,
  statusBadge,
  metaItems,
  badges,
  actions,
  tabs,
  activeTab,
  onTabChange,
  extraContent,
  stickyHeader,
  children,
  contextHolder,
  titleWeight = 'default',
}: DetailPageHeaderProps) {
  const headerClassName = stickyHeader ? `${styles.header} ${styles.headerSticky}` : styles.header;
  const titleClassName =
    titleWeight === 'medium' ? `${styles.companyName} ${styles.companyNameMedium}` : styles.companyName;

  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={headerClassName}>
        <Button type='text' icon={<ArrowLeftOutlined />} onClick={onBack} className={styles.backBtn}>
          {backLabel}
        </Button>

        <div className={styles.companyRow}>
          <div className={styles.companyInfo}>
            <div className={styles.nameRow}>
              <h1 className={titleClassName}>{title}</h1>
              {titleSuffix && <div className={styles.titleSuffix}>{titleSuffix}</div>}
              {badges}
            </div>

            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

            <div className={styles.metaRow}>
              {statusBadge ? (
                <div className={detailHeaderStatusBadgeClass(statusBadge.variant)}>
                  {statusBadge.icon} {statusBadge.label}
                </div>
              ) : null}
              {metaItems}
            </div>
          </div>

          {actions && <div className={styles.actions}>{actions}</div>}
        </div>

        {extraContent}

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

      <div className={styles.contentWrap}>{children}</div>
    </div>
  );
}
export { styles as detailPageHeaderStyles };
