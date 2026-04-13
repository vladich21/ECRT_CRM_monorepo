import { useEffect, useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Input, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useDepartments } from '../../../api/departments/departmentsApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { Department } from '../../../types/referenceTypes';
import styles from './DepartmentsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

export default function DepartmentsListPage() {
  const navigate = useNavigate();
  const { data: departments = [], isLoading, isError } = useDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const sorted = useMemo(
    () => [...departments].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru')),
    [departments],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    if (!q) return sorted;
    return sorted.filter(d => (d.name ?? '').toLowerCase().includes(q));
  }, [sorted, debouncedSearch]);

  const handleOpen = (record: Department) => {
    navigate(`/departments/${record.id}`, {
      state: {
        department: record,
        from: 'departments-list',
      },
    });
  };

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
            <ReferenceBookItemCard
              key={department.id}
              title={department.name || '—'}
              onClick={() => handleOpen(department)}
            />
          ))}
        </ReferenceBookCardList>
      )}
    </ReferenceBookListPage>
  );
}
