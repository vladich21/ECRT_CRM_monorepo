import { useEffect, useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Spin } from 'antd';

import { useDepartments } from '../../../api/departments/departmentsApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import styles from './DepartmentsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

export default function DepartmentsListPage() {
  const { data: departments = [], isLoading, isError } = useDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const debounceTimerId = window.setTimeout(
      () => setDebouncedSearch(searchQuery.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);

  const sorted = useMemo(
    () =>
      [...departments].sort((left, right) =>
        (left.name ?? '').localeCompare(right.name ?? '', 'ru'),
      ),
    [departments],
  );

  const filtered = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    if (!searchLower) return sorted;
    return sorted.filter(department =>
      (department.name ?? '').toLowerCase().includes(searchLower),
    );
  }, [sorted, debouncedSearch]);

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  const total = sorted.length;

  return (
    <ReferenceBookListPage
      title='Отделы'
      subtitle='Справочник отделов'
      filters={
        !isLoading ? (
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
                  Показано: <strong>{filtered.length}</strong> из <strong>{total}</strong>
                </span>
              </div>
            </div>
          </div>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          {total === 0 ? 'Отделы не найдены' : 'Ничего не найдено по запросу'}
        </div>
      ) : (
        <ReferenceBookCardList>
          {filtered.map(department => (
            <ReferenceBookItemCard key={department.id} title={department.name || '—'} />
          ))}
        </ReferenceBookCardList>
      )}
    </ReferenceBookListPage>
  );
}
