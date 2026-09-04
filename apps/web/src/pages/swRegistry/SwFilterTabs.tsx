import styles from './SwRegistry.module.scss';

export type SwFilterTab<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  tabs: SwFilterTab<T>[];
  active: T;
  onChange: (key: T) => void;
  'aria-label'?: string;
};

export function SwFilterTabs<T extends string>({ tabs, active, onChange, 'aria-label': ariaLabel }: Props<T>) {
  return (
    <div className={styles.filterTabs} role='tablist' aria-label={ariaLabel}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          type='button'
          role='tab'
          aria-selected={active === tab.key}
          className={`${styles.filterTab}${active === tab.key ? ` ${styles.filterTabActive}` : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count != null ? <span className={styles.filterTabCount}>{tab.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
