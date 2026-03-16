import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Pagination, Spin } from 'antd';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useActivePatents, useDeletedPatents } from '../../api/patents/patentApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { filterByAdvanced, filterBySearch } from './filters/patentListFilters';
import { PatentCard } from './PatentCard';
import { PatentFiltersModal } from './PatentFiltersModal';
import { PATENT_FILTER_TABS } from './PatentsListPage.types';
import type { ReferenceDataForPatents } from './data';
import type { Patent } from '../../types/patent';
import styles from './PatentsListPage.module.scss';

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

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const { data: activeData, isLoading: isActiveLoading, isError: isActiveError } =
    useActivePatents(page, pageSize);
  const { data: deletedData, isLoading: isDeletedLoading, isError: isDeletedError } =
    useDeletedPatents(page, pageSize);

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

  const activePatents = activeData?.data ?? [];
  const deletedPatents = deletedData?.data ?? [];
  const activeTotal = activeData?.total ?? 0;
  const deletedTotal = deletedData?.total ?? 0;

  const currentPatents = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return activePatents;
      case 'deleted':
        return deletedPatents;
      default:
        return [...activePatents, ...deletedPatents];
    }
  }, [activeTab, activePatents, deletedPatents]);

  const currentTotal = useMemo(() => {
    switch (activeTab) {
      case 'active':
        return activeTotal;
      case 'deleted':
        return deletedTotal;
      default:
        return activeTotal + deletedTotal;
    }
  }, [activeTab, activeTotal, deletedTotal]);

  const tabCounts = useMemo(
    () => ({
      all: activePatents.length + deletedPatents.length,
      active: activePatents.length,
      deleted: deletedPatents.length,
    }),
    [activePatents, deletedPatents]
  );

  const filteredPatents = useMemo(() => {
    const afterAdvanced = filterByAdvanced(currentPatents, appliedFilters);
    return filterBySearch(afterAdvanced, searchQuery, refs);
  }, [currentPatents, appliedFilters, searchQuery, refs]);

  const selectOptions = useMemo(
    () => ({
      departments: (refs?.departments ?? []).map((d) => ({
        label: d.name,
        value: d.id,
      })),
      statuses: (refs?.patentStatuses ?? []).map((s) => ({
        label: s.name,
        value: s.id,
      })),
      users: (refs?.users ?? []).map((u) => ({
        label: u.name,
        value: u.id,
      })),
    }),
    [refs]
  );

  useEffect(() => {
    resetPage();
  }, [searchQuery, activeTab, appliedFilters, resetPage]);

  const handlePatentClick = (patent: Patent) =>
    navigate(`/patents/${patent.id}`, {
      state: { from: 'patents-list', tab: activeTab },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isActiveError || isDeletedError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isPageLoading = isRefsLoading || isActiveLoading || isDeletedLoading;
  const paginationConfig = getPaginationConfig(currentTotal);

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
          !isPageLoading ? (
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
                    Показано: <strong>{filteredPatents.length}</strong> из{' '}
                    <strong>{currentTotal}</strong>
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

      {isPageLoading ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : filteredPatents.length === 0 ? (
        <div className={styles.empty}>Нет результатов интеллектуальной деятельности</div>
      ) : (
        <>
          <div className={styles.cardList}>
            {filteredPatents.map((patent) => (
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
                showTotal={(total) => `Всего: ${total}`}
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
