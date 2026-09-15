import { SW_STRUCTURE_FILTER_TABS, type SwStructureFilterTab } from './SwStructurePage.types';
import styles from './SwStructurePage.module.scss';

type Props = {
  activeTab: SwStructureFilterTab;
  onTabChange: (tab: SwStructureFilterTab) => void;
  activeCount: number;
  archivedCount: number;
};

/** Вкладки над экраном. Поиск и счётчик живут в панели дерева — рядом с тем, что фильтруют. */
export function SwStructureListFiltersBar({ activeTab, onTabChange, activeCount, archivedCount }: Props) {
  const counts: Record<SwStructureFilterTab, number> = {
    active: activeCount,
    archived: archivedCount,
  };

  return (
    <div className={styles.filterSection}>
      <div className={styles.filterTabsRow}>
        <div className={styles.filterTabs}>
          {SW_STRUCTURE_FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              type='button'
              className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
              onClick={() => onTabChange(key)}
            >
              {label} <span className={styles.filterTabCount}>{counts[key]}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
