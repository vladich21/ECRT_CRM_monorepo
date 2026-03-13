import type { ReactNode } from 'react';
import styles from './PageHeader.module.scss';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Кнопки в правой части шапки */
  actions?: ReactNode;
  /** Контент под шапкой (вкладки, строка поиска и т.п.) */
  filters?: ReactNode;
}

export function PageHeader({ title, subtitle, actions, filters }: PageHeaderProps) {
  return (
    <div className={styles.pageBlock}>
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderContainer}>
          <div className={styles.pageHeaderLeft}>
            <h1 className={styles.pageTitle}>{title}</h1>
            {subtitle && (
              <span className={styles.pageSubtitle}>{subtitle}</span>
            )}
          </div>

          {actions && (
            <div className={styles.pageHeaderRight}>{actions}</div>
          )}
        </div>
      </header>

      {filters}
    </div>
  );
}
