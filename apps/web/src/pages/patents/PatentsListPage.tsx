import { ExportOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Pagination, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import { usePatentsLinkedContractIds, usePatentsList } from '@/api/patents/patentApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { getListScrollY, useListScrollRestoration, useScrollToTopOnPageChange } from '@/hooks/useListScrollRestoration';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '@/hooks/useServerTablePagination';
import type { Patent } from '@/types/patent';
import type { ReferenceDataForPatents } from './types/data';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { usePatentsListContractIdsForFilter } from './hooks/usePatentsListContractIdsForFilter';
import { usePatentsListSearchDebounce } from './hooks/usePatentsListSearchDebounce';
import { usePatentsListSelectOptions } from './hooks/usePatentsListSelectOptions';
import { usePatentsListServerFilters } from './hooks/usePatentsListServerFilters';
import { usePatentsListUiState } from './hooks/usePatentsListUiState';
import { PatentCard } from './components/cards/PatentCard';
import { PatentFiltersModal } from './components/filters/PatentFiltersModal';
import { PatentExportModal } from './components/export/PatentExportModal';
import { PatentsListFiltersBar } from './components/filters/PatentsListFiltersBar';
import styles from './PatentsListPage.module.scss';
import { buildPatentsListNavSnapshot } from './utils/patentsListNavSnapshot';
import { buildPatentsListQueryResetKey } from './utils/patentsListQueryResetKey';
import { patentListTabToDeletedScope } from './utils/patentListTabScope';

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

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { restoreToken, pendingScrollY } = usePatentsListUiState(
    location,
    navigate,
    { setSearchQuery, alignDebouncedWithQuery },
    { setActiveTab, setAppliedFilters, setDraftFilters, restoreListSorting },
    { setPage, setPageSize },
    { searchQuery, activeTab, appliedFilters, page, pageSize, sortBy, sortOrder },
  );

  const queryResetKey = useMemo(
    () =>
      buildPatentsListQueryResetKey({
        debouncedSearch,
        activeTab,
        appliedFilters,
        sortBy,
        sortOrder,
      }),
    [debouncedSearch, activeTab, appliedFilters, sortBy, sortOrder],
  );

  useResetPageWhenListQueryChanges(queryResetKey, resetPage, restoreToken);

  const deletedScope = patentListTabToDeletedScope(activeTab);
  const serverFilters = usePatentsListServerFilters(debouncedSearch, appliedFilters, sortBy, sortOrder);

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
      'partners',
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

  useServerPaginationClamp({
    total,
    page,
    pageSize,
    disabled: isRefsError || isError,
    handleTableChange,
  });

  const contractIdsForPatentFilter = usePatentsListContractIdsForFilter(
    patentLinkedContractIds,
    appliedFilters.contractId,
    draftFilters.contractId,
  );

  const selectOptions = usePatentsListSelectOptions(refs, contractIdsForPatentFilter);

  const isInitialLoad = isRefsLoading || (isLoading && !listData);
  const paginationConfig = getPaginationConfig(total);

  useListScrollRestoration({
    pendingScrollY,
    isListReady: !isInitialLoad && !isFetching,
  });
  useScrollToTopOnPageChange(page, restoreToken);

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
          getListScrollY(),
        ),
      },
    });

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

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
              type='default'
              icon={<ExportOutlined />}
              onClick={() => setIsExportModalOpen(true)}
              disabled={isInitialLoad}
            >
              Экспорт
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
              onSortFieldChange={setSortField}
              onToggleSortOrder={toggleSortOrder}
            />
          ) : undefined
        }
      />

      <PatentExportModal
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        deletedScope={deletedScope}
        serverFilters={serverFilters}
        refs={refs}
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
                {...paginationConfig}
                onChange={(newPage, newPageSize) =>
                  handleTableChange({
                    current: newPage,
                    pageSize: newPageSize ?? pageSize,
                  })
                }
                onShowSizeChange={(_, size) => handleTableChange({ current: 1, pageSize: size })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
