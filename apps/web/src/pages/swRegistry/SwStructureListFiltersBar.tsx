import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import { SW_STRUCTURE_FILTER_TABS, type SwStructureFilterTab } from './SwStructurePage.types';
import styles from './SwStructurePage.module.scss';

type Props = {
  activeTab: SwStructureFilterTab;
  onTabChange: (tab: SwStructureFilterTab) => void;
  activeCount: number;
  archivedCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
};

export function SwStructureListFiltersBar({
  activeTab,
  onTabChange,
  activeCount,
  archivedCount,
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
}: Props) {
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
        <div className={styles.filterTabsRight}>
          <Input.Search
            className={styles.searchInTabsRow}
            placeholder='Код, наименование элемента'
            allowClear
            enterButton={false}
            prefix={<SearchOutlined className={styles.searchIcon} />}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
          <span className={styles.resultCount}>
            Показано: <strong>{shownCount}</strong> из <strong>{totalCount}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
