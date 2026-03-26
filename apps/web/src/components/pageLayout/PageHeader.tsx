import type { ReactNode } from 'react';

import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  filters?: ReactNode;
  transparentBlock?: boolean;
  /** Средняя насыщенность заголовка списка (500 вместо 600) */
  titleWeight?: 'default' | 'medium';
}
export function PageHeader({
  title,
  subtitle,
  actions,
  filters,
  transparentBlock,
  titleWeight = 'default',
}: PageHeaderProps) {
  return (
    <div className={`${styles.pageBlock} ${transparentBlock ? styles.pageBlockTransparent : ''}`}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderContainer}>
          <div className={styles.pageHeaderLeft}>
            <h1
              className={`${styles.pageTitle} ${titleWeight === 'medium' ? styles.pageTitleMedium : ''}`.trim()}
            >
              {title}
            </h1>
            {subtitle && <span className={styles.pageSubtitle}>{subtitle}</span>}
          </div>

          {actions && <div className={styles.pageHeaderRight}>{actions}</div>}
        </div>
      </header>

      {filters}
    </div>
  );
}
