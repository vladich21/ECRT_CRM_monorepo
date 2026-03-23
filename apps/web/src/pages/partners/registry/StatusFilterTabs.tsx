import type { PartnerRegistryStatus } from '../../../types/partnerRegistry';
import styles from './StatusFilterTabs.module.scss';

type StatusTab = 'all' | PartnerRegistryStatus;

interface StatusFilterTabsProps {
  activeStatus: StatusTab;
  counts: Record<StatusTab, number>;
  onChange: (status: StatusTab) => void;
}

const TABS: { key: StatusTab; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'potential', label: 'Потенциальные' },
  { key: 'blocked', label: 'Заблокированные' },
  { key: 'archive', label: 'Архив' },
];

export default function StatusFilterTabs({ activeStatus, counts, onChange }: StatusFilterTabsProps) {
  return (
    <div className={styles.filterTabs}>
      {TABS.map(tab => (
        <button
          key={tab.key}
          type='button'
          className={`${styles.filterTab}${activeStatus === tab.key ? ` ${styles.filterTabActive}` : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label} <span className={styles.filterTabCount}>{counts[tab.key]}</span>
        </button>
      ))}
    </div>
  );
}

export type { StatusTab };
