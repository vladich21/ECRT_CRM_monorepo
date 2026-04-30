import { SearchOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';

import type { PatentListSortBy } from '@/api/patents/patentApi';

import styles from '../../PatentsListPage.module.scss';
import { PATENT_FILTER_TABS, type PatentFilterTab } from '@/pages/patents/types/PatentsListPage.types';

const PATENT_SORT_OPTIONS: { value: PatentListSortBy; label: string }[] = [
  { value: 'registration_number', label: 'По номеру (ИЦ ЖТ)' },
  { value: 'registration_date', label: 'По дате регистрации (ИЦ ЖТ)' },
  { value: 'registration_date_cir', label: 'По дате регистрации (ЦИР)' },
  { value: 'created_at', label: 'По дате создания карточки' },
];

export type PatentsListTabCounts = Record<PatentFilterTab, number>;

export type PatentsListFiltersBarProps = {
  activeTab: PatentFilterTab;
  onTabChange: (tab: PatentFilterTab) => void;
  tabCounts: PatentsListTabCounts;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
  sortBy: PatentListSortBy;
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: PatentListSortBy) => void;
  onToggleSortOrder: () => void;
};

export function PatentsListFiltersBar({
  activeTab,
  onTabChange,
  tabCounts,
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
  sortBy,
  sortOrder,
  onSortFieldChange,
  onToggleSortOrder,
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
          <Select<PatentListSortBy>
            className={styles.sortSelect}
            value={sortBy}
            options={PATENT_SORT_OPTIONS}
            onChange={onSortFieldChange}
            popupMatchSelectWidth={false}
          />
          <Button
            type='default'
            icon={<SortAscendingOutlined />}
            title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
            onClick={onToggleSortOrder}
            className={styles.sortDirBtn}
          >
            {sortOrder === 'asc' ? 'A→Я' : 'Я→A'}
          </Button>
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
