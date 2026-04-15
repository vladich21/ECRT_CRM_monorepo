import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

import type { PatentGrantRegistryListScope } from '../../../../api/patents/patentGrantsApi';
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
};

export function PatentGrantsRegistryFiltersBar({
  activeTab,
  onTabChange,
  tabCounts,
  searchQuery,
  onSearchChange,
  shownCount,
  totalCount,
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
          <Input.Search
            className={patentListStyles.searchInTabsRow}
            placeholder='Номер документа, ведомство, название или номер РИД...'
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
