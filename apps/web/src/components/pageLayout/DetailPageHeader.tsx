import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';

import styles from './DetailPageHeader.module.scss';

interface TabItem {
  key: string;
  label: ReactNode;
}
interface StatusBadge {
  label: string;
  color: string;
  icon?: ReactNode;
}
interface DetailPageHeaderProps {
  title: string;
  titleSuffix?: ReactNode;
  /** Строка под заголовком (контрагент, реквизиты и т.п.) */
  subtitle?: ReactNode;
  backLabel: string;
  onBack: () => void;
  statusBadge?: StatusBadge;
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
  /** 500 вместо 700 для заголовка карточки (контрагенты, РИД) */
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
  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={`${styles.header} ${stickyHeader ? styles.headerSticky : ''}`}>
        <Button type='text' icon={<ArrowLeftOutlined />} onClick={onBack} className={styles.backBtn}>
          {backLabel}
        </Button>

        <div className={styles.companyRow}>
          <div className={styles.companyInfo}>
            <div className={styles.nameRow}>
              <h1
                className={`${styles.companyName} ${titleWeight === 'medium' ? styles.companyNameMedium : ''}`.trim()}
              >
                {title}
              </h1>
              {titleSuffix && <div className={styles.titleSuffix}>{titleSuffix}</div>}
              {badges}
            </div>

            {subtitle && <div className={styles.subtitle}>{subtitle}</div>}

            <div className={styles.metaRow}>
              {statusBadge && (
                <div
                  className={styles.statusBadge}
                  style={{
                    background: `${statusBadge.color}20`,
                    border: `1px solid ${statusBadge.color}50`,
                    color: statusBadge.color,
                  }}
                >
                  {statusBadge.icon} {statusBadge.label}
                </div>
              )}
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
