import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import styles from './PatentsListPage.module.scss';
import { PATENT_FILTER_TABS, type PatentFilterTab } from './PatentsListPage.types';

export type PatentsListTabCounts = Record<PatentFilterTab, number>;

export type PatentsListFiltersBarProps = {
  activeTab: PatentFilterTab;
  onTabChange: (tab: PatentFilterTab) => void;
  tabCounts: PatentsListTabCounts;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
};

export function PatentsListFiltersBar({
  activeTab,
  onTabChange,
  tabCounts,
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
}: PatentsListFiltersBarProps) {
  return (
    <div className={styles.filterSection}>
      <div className={styles.filterTabsRow}>
        <div className={styles.filterTabs}>
          {PATENT_FILTER_TABS.map(({ key, label }) => (
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
            placeholder='Наименование, рег. номер, КД, ЦИР, договор, проект...'
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
