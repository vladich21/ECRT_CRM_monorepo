import type { ReactNode } from 'react';
import { Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import styles from './DetailPageHeader.module.scss';

interface TabItem {
  key: string;
  label: string;
}

interface StatusBadge {
  label: string;
  color: string;
  icon?: ReactNode;
}

interface DetailPageHeaderProps {
  /** Page title (h1) */
  title: string;
  /** Text for the back button */
  backLabel: string;
  /** Back navigation handler */
  onBack: () => void;
  /** Status badge with color */
  statusBadge?: StatusBadge;
  /** Meta items displayed under the title (spans, tags, etc.) */
  metaItems?: ReactNode[];
  /** Badges displayed next to the title (key supplier, targeted, etc.) */
  badges?: ReactNode[];
  /** Action buttons (edit, delete, etc.) */
  actions?: ReactNode;
  /** Tab items */
  tabs: TabItem[];
  /** Currently active tab key */
  activeTab: string;
  /** Tab change handler */
  onTabChange: (key: string) => void;
  /** Custom decorative circle colors (defaults to blue) */
  circleColor?: string;
  /** Extra content to render inside the header (e.g., between meta and tabs) */
  extraContent?: ReactNode;
  /** Content below the header */
  children?: ReactNode;
  /** Additional context holder for notifications */
  contextHolder?: ReactNode;
}

export default function DetailPageHeader({
  title,
  backLabel,
  onBack,
  statusBadge,
  metaItems,
  badges,
  actions,
  tabs,
  activeTab,
  onTabChange,
  circleColor,
  extraContent,
  children,
  contextHolder,
}: DetailPageHeaderProps) {
  const circleStyles = circleColor
    ? {
        outer: {
          background: `${circleColor}15`,
          border: `1px solid ${circleColor}30`,
        },
        inner: {
          background: `${circleColor}08`,
          border: `1px solid ${circleColor}20`,
        },
      }
    : undefined;

  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={styles.header}>
        <div className={styles.circleOuter} style={circleStyles?.outer} />
        <div className={styles.circleInner} style={circleStyles?.inner} />

        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={onBack}
          className={styles.backBtn}
        >
          {backLabel}
        </Button>

        <div className={styles.companyRow}>
          <div className={styles.companyInfo}>
            <div className={styles.nameRow}>
              <h1 className={styles.companyName}>{title}</h1>
              {badges}
            </div>

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
          {tabs.map((tab) => (
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
