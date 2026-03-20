import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Pagination, Spin } from 'antd';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { usePatentsList, type PatentsDeletedScope } from '../../api/patents/patentApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { PatentCard } from './PatentCard';
import { PatentFiltersModal } from './PatentFiltersModal';
import { PATENT_FILTER_TABS, type PatentFilterTab } from './PatentsListPage.types';
import type { ReferenceDataForPatents } from './data';
import type { Patent } from '../../types/patent';
import styles from './PatentsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

function tabToDeletedScope(tab: PatentFilterTab): PatentsDeletedScope {
  if (tab === 'deleted') return 'deleted';
  if (tab === 'active') return 'active';
  return 'all';
}

export interface CounterType {
  active?: number;
  deleted?: number;
}

export type ActionType = 'active' | 'deleted';

export default function PatentsListPage() {
  const navigate = useNavigate();

  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    draftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  } = usePatentListFilters();

  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const deletedScope = tabToDeletedScope(activeTab);

  const serverFilters = useMemo(
    () => ({
      search: debouncedSearch,
      departmentId: appliedFilters.departmentId,
      statusId: appliedFilters.statusId,
      authorIds: appliedFilters.authorIds,
      responsibleId: appliedFilters.responsibleId,
    }),
    [debouncedSearch, appliedFilters],
  );

  const {
    data: listData,
    isLoading,
    isError,
    isFetching,
  } = usePatentsList(deletedScope, page, pageSize, serverFilters);

  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'contractCategories',
    'patentStatuses',
    'patentIntellectProps',
  ]);

  const refs = referenceBooks as ReferenceDataForPatents;

  const patents = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const tabCounts = listData?.tab_counts ?? { all: 0, active: 0, deleted: 0 };

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, activeTab, appliedFilters, resetPage]);

  /** Если total стал меньше (фильтр, удаление, invalidate), а номер страницы больше возможного — поджимаем. */
  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize } as never);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);

  const selectOptions = useMemo(
    () => ({
      departments: (refs?.departments ?? []).map((department) => ({
        label: department.name,
        value: department.id,
      })),
      statuses: (refs?.patentStatuses ?? []).map((status) => ({
        label: status.name,
        value: status.id,
      })),
      users: (refs?.users ?? []).map((user) => ({
        label: user.name,
        value: user.id,
      })),
    }),
    [refs],
  );

  const handlePatentClick = (patent: Patent) =>
    navigate(`/patents/${patent.id}`, {
      state: { from: 'patents-list', tab: activeTab },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isInitialLoad = isRefsLoading || (isLoading && !listData);
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <BackButton path="/" />

      <PageHeader
        title="РИД"
        subtitle="Результаты интеллектуальной деятельности"
        actions={
          <>
            <Button
              type="default"
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={
                activeFiltersCount > 0 ? styles.filtersBtnActive : undefined
              }
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={styles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/patents/create')}
              disabled={activeTab === 'deleted'}
            >
              Добавить РИД
            </Button>
          </>
        }
        filters={
          !isInitialLoad ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  {PATENT_FILTER_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.filterTab}${
                        activeTab === key ? ` ${styles.filterTabActive}` : ''
                      }`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}{' '}
                      <span className={styles.filterTabCount}>{tabCounts[key]}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder="Поиск по названию, номеру, КД..."
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{patents.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <PatentFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={applyFilters}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : patents.length === 0 ? (
        <div className={styles.empty}>Нет результатов интеллектуальной деятельности</div>
      ) : (
        <>
          <div className={`${styles.cardList}${isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''}`}>
            {patents.map((patent) => (
              <PatentCard
                key={patent.id}
                patent={patent}
                refs={refs}
                onClick={handlePatentClick}
              />
            ))}
          </div>
          {(paginationConfig.total ?? 0) > 0 && (
            <div className={styles.pagination}>
              <Pagination
                current={paginationConfig.current}
                pageSize={paginationConfig.pageSize}
                total={paginationConfig.total}
                showSizeChanger
                pageSizeOptions={[20, 50, 100]}
                showTotal={(t, range) => `${range[0]}-${range[1]} из ${t}`}
                onChange={handlePageChange}
                onShowSizeChange={(_, size) => handlePageChange(1, size)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
