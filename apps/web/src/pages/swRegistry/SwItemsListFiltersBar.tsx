import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import type { SwItemsTabCounts } from '@/types/swRegistry';
import { SW_ITEMS_FILTER_TABS, type SwItemsFilterTab } from './SwItemsListPage.types';
import styles from './SwItemsListPage.module.scss';

type Props = {
  activeTab: SwItemsFilterTab;
  onTabChange: (tab: SwItemsFilterTab) => void;
  tabCounts: SwItemsTabCounts;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
};

export function SwItemsListFiltersBar({
  activeTab,
  onTabChange,
  tabCounts,
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
}: Props) {
  return (
    <div className={styles.filterSection}>
      <div className={styles.filterTabsRow}>
        <div className={styles.filterTabs}>
          {SW_ITEMS_FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              type='button'
              className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
              onClick={() => onTabChange(key)}
            >
              {label} <span className={styles.filterTabCount}>{tabCounts[key]}</span>
            </button>
          ))}
        </div>
        <div className={styles.filterTabsRight}>
          <Input.Search
            className={styles.searchInTabsRow}
            placeholder='Обозначение, наименование, элемент…'
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
