import { SearchOutlined, SortAscendingOutlined } from '@ant-design/icons';
import { Button, Input, Select } from 'antd';

import type { PatentGrantRegistryListScope } from '../../../../api/patents/patentGrantsApi';
import {
  PATENT_GRANTS_REGISTRY_SORT_OPTIONS,
  type PatentGrantsRegistrySortBy,
} from '../../../../api/patents/patentGrantsRegistryFilters.types';
import patentListStyles from '../../../patents/PatentsListPage.module.scss';

export const PATENT_GRANT_REGISTRY_TABS: { key: PatentGrantRegistryListScope; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'active', label: 'Активные' },
  { key: 'other', label: 'Прочие статусы' },
];

export type PatentGrantRegistryTabCounts = Record<PatentGrantRegistryListScope, number>;

export type PatentGrantsRegistryFiltersBarProps = {
  activeTab: PatentGrantRegistryListScope;
  onTabChange: (tab: PatentGrantRegistryListScope) => void;
  tabCounts: PatentGrantRegistryTabCounts;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  shownCount: number;
  totalCount: number;
  sortBy: PatentGrantsRegistrySortBy;
  sortOrder: 'asc' | 'desc';
  onSortFieldChange: (field: PatentGrantsRegistrySortBy) => void;
  onToggleSortOrder: () => void;
};

export function PatentGrantsRegistryFiltersBar({
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
}: PatentGrantsRegistryFiltersBarProps) {
  return (
    <div className={patentListStyles.filterSection}>
      <div className={patentListStyles.filterTabsRow}>
        <div className={patentListStyles.filterTabs}>
          {PATENT_GRANT_REGISTRY_TABS.map(({ key, label }) => (
            <button
              key={key}
              type='button'
              className={`${patentListStyles.filterTab}${activeTab === key ? ` ${patentListStyles.filterTabActive}` : ''}`}
              onClick={() => onTabChange(key)}
            >
              {label}{' '}
              <span className={patentListStyles.filterTabCount}>{tabCounts[key]}</span>
            </button>
          ))}
        </div>
        <div className={patentListStyles.filterTabsRight}>
          <Select<PatentGrantsRegistrySortBy>
            className={patentListStyles.sortSelect}
            value={sortBy}
            options={PATENT_GRANTS_REGISTRY_SORT_OPTIONS}
            onChange={onSortFieldChange}
            popupMatchSelectWidth={false}
          />
          <Button
            type='default'
            icon={<SortAscendingOutlined />}
            title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
            onClick={onToggleSortOrder}
            className={patentListStyles.sortDirBtn}
          >
            {sortOrder === 'asc' ? 'A→Я' : 'Я→A'}
          </Button>
          <Input.Search
            className={patentListStyles.searchInTabsRow}
            placeholder='Номер документа, ведомство, название, номер РИД или КД...'
            allowClear
            enterButton={false}
            prefix={<SearchOutlined className={patentListStyles.searchIcon} />}
            value={searchQuery}
            onChange={event => onSearchChange(event.target.value)}
          />
          <span className={patentListStyles.resultCount}>
            Показано: <strong>{shownCount}</strong> из <strong>{totalCount}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
