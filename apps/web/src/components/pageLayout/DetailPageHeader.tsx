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
  detailHeaderVariantForPatentRidStatus,
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
  metaExtra?: ReactNode;
  metaItems?: ReactNode[];
  lead?: ReactNode;
  badges?: ReactNode[];
  actions?: ReactNode;
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (key: string) => void;
  extraContent?: ReactNode;
  stickyHeader?: boolean;
  /** Скрывает кнопку «Назад», вкладки и actions при window.print(). */
  hideNavigationOnPrint?: boolean;
  /** Атрибут data-print-scope на корне — для точечных @media print стилей страницы. */
  printScope?: string;
  contentClassName?: string;
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
  metaExtra,
  metaItems,
  lead,
  badges,
  actions,
  tabs,
  activeTab,
  onTabChange,
  extraContent,
  stickyHeader,
  hideNavigationOnPrint,
  printScope,
  contentClassName,
  children,
  contextHolder,
  titleWeight = 'default',
}: DetailPageHeaderProps) {
  const headerClassName = stickyHeader ? `${styles.header} ${styles.headerSticky}` : styles.header;
  const titleClassName =
    titleWeight === 'medium' ? `${styles.companyName} ${styles.companyNameMedium}` : styles.companyName;

  return (
    <div className={styles.pageRoot} {...(printScope ? { 'data-print-scope': printScope } : {})}>
      {contextHolder}

      <div className={headerClassName}>
        <Button
          type='text'
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className={styles.backBtn}
          {...(hideNavigationOnPrint ? { 'data-print-hide': true } : {})}
        >
          {backLabel}
        </Button>

        <div className={styles.companyRow}>
          <div className={styles.companyInfo}>
            <div className={styles.nameRow}>
              {lead ? <div className={styles.nameRowLead}>{lead}</div> : null}
              <h1 className={titleClassName}>{title}</h1>
              {titleSuffix ? <div className={styles.titleSuffix}>{titleSuffix}</div> : null}
              {badges?.length ? <div className={styles.nameRowBadges}>{badges}</div> : null}
            </div>

            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

            <div className={styles.metaRow}>
              {statusBadge ? (
                <div className={detailHeaderStatusBadgeClass(statusBadge.variant)}>
                  {statusBadge.icon} {statusBadge.label}
                </div>
              ) : null}
              {metaExtra ? <div className={styles.metaRowTrail}>{metaExtra}</div> : null}
              {metaItems}
            </div>
          </div>

          {actions && (
            <div className={styles.actions} {...(hideNavigationOnPrint ? { 'data-print-hide': true } : {})}>
              {actions}
            </div>
          )}
        </div>

        {extraContent}

        <div className={styles.tabs} {...(hideNavigationOnPrint ? { 'data-print-hide': true } : {})}>
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

      <div className={[styles.contentWrap, contentClassName].filter(Boolean).join(' ')}>{children}</div>
    </div>
  );
}
export { styles as detailPageHeaderStyles };
