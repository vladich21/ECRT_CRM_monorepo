import { useEffect, useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Spin } from 'antd';

import { usePositions } from '@/api/positions/positionApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { PositionCard } from './PositionCard';
import styles from './PositionsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

const PositionsListPage: React.FC = () => {
  const { data = [], isLoading: loading, isError } = usePositions();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const debounceTimerId = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);

  const sorted = useMemo(
    () =>
      [...data].sort((left, right) => (left.name ?? '').localeCompare(right.name ?? '', 'ru')),
    [data],
  );

  const filteredPositions = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    if (!searchLower) return sorted;
    return sorted.filter(position =>
      (position.name ?? '').toLowerCase().includes(searchLower),
    );
  }, [sorted, debouncedSearch]);

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  const total = sorted.length;

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />
      <PageHeader
        title='Должности'
        subtitle='Справочник должностей'
        filters={
          !loading ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder='Поиск по названию...'
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{filteredPositions.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {loading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={styles.cardList}>
          {filteredPositions.length === 0 ? (
            <div className={styles.empty}>{total === 0 ? 'Должности не найдены' : 'Ничего не найдено по запросу'}</div>
          ) : (
            filteredPositions.map(position => <PositionCard key={position.id} position={position} />)
          )}
        </div>
      )}
    </div>
  );
};

export default PositionsListPage;
