import { ExportOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Pagination, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { openFromRegistry, useRegistryScroll } from '@/hooks/registryScroll';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '@/hooks/useServerTablePagination';
import type { Patent } from '@/types/patent';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { usePatentsListData } from './hooks/usePatentsListData';
import { usePatentsListServerFilters } from './hooks/usePatentsListServerFilters';
import { usePatentsListUiState } from './hooks/usePatentsListUiState';
import { PatentCard } from './components/cards/PatentCard';
import { PatentFiltersModal } from './components/filters/PatentFiltersModal';
import { PatentExportModal } from './components/export/PatentExportModal';
import { PatentsListFiltersBar } from './components/filters/PatentsListFiltersBar';
import styles from './PatentsListPage.module.scss';
import { buildPatentsListQueryResetKey } from './utils/patentsListQueryResetKey';
import { patentListTabToDeletedScope } from './utils/patentListTabScope';

const SEARCH_DEBOUNCE_MS = 350;

export default function PatentsListPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    void import('./PatentDetailsPage');
  }, []);

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

  const [debouncedSearch, alignDebouncedWithQuery] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const { restoreToken, flushPersist } = usePatentsListUiState(
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
    patents,
    total,
    tabCounts,
    refs,
    selectOptions,
    isInitialLoad,
    isError,
    isFetching,
    isRefsError,
  } = usePatentsListData({
    deletedScope,
    page,
    pageSize,
    serverFilters,
    appliedFilters,
    draftFilters,
  });

  useServerPaginationClamp({
    total,
    page,
    pageSize,
    disabled: isRefsError || isError,
    handleTableChange,
  });

  const paginationConfig = getPaginationConfig(total);

  useRegistryScroll({
    isListReady: !isInitialLoad && !isFetching,
    page,
    restoreToken,
  });

  const handlePatentClick = (patent: Patent) => {
    flushPersist();
    openFromRegistry(location, navigate, `/patents/${patent.id}`, {
      state: {
        from: 'patents-list',
        tab: activeTab,
        patent,
      },
    });
  };

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
          <div className={`${styles.cardList}${isFetching && !isInitialLoad ? ` ${styles.cardListDimmed}` : ''}`}>
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
