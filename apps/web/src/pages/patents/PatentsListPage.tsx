import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Pagination, Spin } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import { usePatentsLinkedContractIds, usePatentsList } from '@/api/patents/patentApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useResetServerPageUnlessSkipped } from '@/hooks/useListReturnFromDetail';
import { useServerTablePagination } from '@/hooks/useServerTablePagination';
import type { Patent } from '@/types/patent';
import type { ReferenceDataForPatents } from './types/data';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { usePatentsListContractIdsForFilter } from './hooks/usePatentsListContractIdsForFilter';
import { usePatentsListPaginationClamp } from './hooks/usePatentsListPaginationClamp';
import { usePatentsListRestoreFromDetail } from './hooks/usePatentsListRestoreFromDetail';
import { usePatentsListSearchDebounce } from './hooks/usePatentsListSearchDebounce';
import { usePatentsListSelectOptions } from './hooks/usePatentsListSelectOptions';
import { usePatentsListServerFilters } from './hooks/usePatentsListServerFilters';
import { PatentCard } from './components/cards/PatentCard';
import { PatentFiltersModal } from './components/filters/PatentFiltersModal';
import { PatentsListFiltersBar } from './components/filters/PatentsListFiltersBar';
import styles from './PatentsListPage.module.scss';
import { buildPatentsListNavSnapshot } from './utils/patentsListNavSnapshot';
import { loadPatentsListPersistedUi, savePatentsListPersistedUi } from './utils/patentsListPersistedUi';
import { patentListTabToDeletedScope } from './utils/patentListTabScope';

const PERSIST_UI_DEBOUNCE_MS = 400;

export default function PatentsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    setAppliedFilters,
    draftFilters,
    setDraftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
    sortBy,
    sortOrder,
    setSortField,
    toggleSortOrder,
    restoreListSorting,
  } = usePatentListFilters();

  const { debouncedSearch, alignDebouncedWithQuery } = usePatentsListSearchDebounce(searchQuery);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const restoredFromNavigationRef = useRef(false);
  const canPersistPatentsListUiRef = useRef(false);

  const { skipNextListResetRef } = usePatentsListRestoreFromDetail(
    location,
    navigate,
    { setSearchQuery, alignDebouncedWithQuery },
    { setActiveTab, setAppliedFilters, setDraftFilters, restoreListSorting },
    { setPage, setPageSize },
    { restoredFromNavigationRef },
  );

  useLayoutEffect(() => {
    if (restoredFromNavigationRef.current) {
      restoredFromNavigationRef.current = false;
    } else {
      const persisted = loadPatentsListPersistedUi();
      if (persisted) {
        skipNextListResetRef.current = true;
        setSearchQuery(persisted.searchQuery);
        alignDebouncedWithQuery(persisted.searchQuery.trim());
        setActiveTab(persisted.activeTab);
        setAppliedFilters(persisted.appliedFilters);
        setDraftFilters(persisted.appliedFilters);
        setPage(persisted.page);
        setPageSize(persisted.pageSize);
        restoreListSorting({ sortBy: persisted.sortBy, sortOrder: persisted.sortOrder });
      }
    }
    canPersistPatentsListUiRef.current = true;
  }, []);

  const deletedScope = patentListTabToDeletedScope(activeTab);
  const serverFilters = usePatentsListServerFilters(debouncedSearch, appliedFilters, sortBy, sortOrder);

  const appliedFiltersResetKey = useMemo(
    () =>
      JSON.stringify({
        departmentId: appliedFilters.departmentId,
        statusId: appliedFilters.statusId,
        authorIds: [...(appliedFilters.authorIds ?? [])].sort(),
        areaIds: [...(appliedFilters.areaIds ?? [])].sort(),
        responsibleId: appliedFilters.responsibleId,
        registrationYears: [...(appliedFilters.registrationYears ?? [])].sort((a, b) => a - b),
        registrationCirYears: [...(appliedFilters.registrationCirYears ?? [])].sort((a, b) => a - b),
        projectId: appliedFilters.projectId,
        contractId: appliedFilters.contractId,
        grantRegionKeys: [...(appliedFilters.grantRegionKeys ?? [])].sort(),
      }),
    [appliedFilters],
  );

  const {
    data: listData,
    isLoading,
    isError,
    isFetching,
  } = usePatentsList(deletedScope, page, pageSize, serverFilters);

  const { data: patentLinkedContractIds = [] } = usePatentsLinkedContractIds(deletedScope);

  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(
    [
      'departments',
      'users',
      'contracts',
      'projects',
      'contractCategories',
      'patentStatuses',
      'patentIntellectProps',
      'patentAreas',
    ],
    { contractsIncludeInactive: true },
  );

  const refs = referenceBooks as ReferenceDataForPatents;
  const patents = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const tabCounts = listData?.tab_counts ?? { all: 0, deleted: 0 };

  useEffect(() => {
    if (!canPersistPatentsListUiRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePatentsListPersistedUi({
        searchQuery,
        activeTab,
        appliedFilters,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, activeTab, appliedFilters, page, pageSize, sortBy, sortOrder]);

  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [
    debouncedSearch,
    activeTab,
    appliedFiltersResetKey,
    sortBy,
    sortOrder,
    resetPage,
  ]);

  usePatentsListPaginationClamp({
    total,
    page,
    pageSize,
    isError: isRefsError || isError,
    handleTableChange,
  });

  const contractIdsForPatentFilter = usePatentsListContractIdsForFilter(
    patentLinkedContractIds,
    appliedFilters.contractId,
    draftFilters.contractId,
  );

  const selectOptions = usePatentsListSelectOptions(refs, contractIdsForPatentFilter);

  const handlePatentClick = (patent: Patent) =>
    navigate(`/patents/${patent.id}`, {
      state: {
        from: 'patents-list',
        tab: activeTab,
        patentsListReturn: buildPatentsListNavSnapshot(
          searchQuery,
          activeTab,
          appliedFilters,
          page,
          pageSize,
          sortBy,
          sortOrder,
        ),
      },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    });

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  const isInitialLoad = isRefsLoading || (isLoading && !listData);
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр РИД'
        titleWeight='medium'
        subtitle='управление РИД'
        actions={
          <>
            <Button
              type='default'
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
            </Button>
            <Button
              type='primary'
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
            <PatentsListFiltersBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              shownCount={patents.length}
              totalCount={total}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortFieldChange={field => {
                setSortField(field);
                resetPage();
              }}
              onToggleSortOrder={() => {
                toggleSortOrder();
                resetPage();
              }}
            />
          ) : undefined
        }
      />

      <PatentFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={() => {
          applyFilters();
          resetPage();
        }}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : patents.length === 0 ? (
        <div className={styles.empty}>Нет результатов интеллектуальной деятельности</div>
      ) : (
        <>
          <div className={`${styles.cardList}${isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''}`}>
            {patents.map(patent => (
              <PatentCard key={patent.id} patent={patent} refs={refs} onClick={handlePatentClick} />
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
