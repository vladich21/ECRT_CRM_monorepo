import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Pagination, Spin } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { usePatentsLinkedContractIds, usePatentsList } from '../../api/patents/patentApiHooks';
import { BackButton } from '../../components/backButton/BackButton';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useResetServerPageUnlessSkipped } from '../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import type { Patent } from '../../types/patent';
import type { ReferenceDataForPatents } from './data';
import { usePatentListFilters } from './hooks/usePatentListFilters';
import { usePatentsListContractIdsForFilter } from './hooks/usePatentsListContractIdsForFilter';
import { usePatentsListPaginationClamp } from './hooks/usePatentsListPaginationClamp';
import { usePatentsListRestoreFromDetail } from './hooks/usePatentsListRestoreFromDetail';
import { usePatentsListSearchDebounce } from './hooks/usePatentsListSearchDebounce';
import { usePatentsListSelectOptions } from './hooks/usePatentsListSelectOptions';
import { usePatentsListServerFilters } from './hooks/usePatentsListServerFilters';
import { PatentCard } from './PatentCard';
import { PatentFiltersModal } from './PatentFiltersModal';
import { PatentsListFiltersBar } from './PatentsListFiltersBar';
import styles from './PatentsListPage.module.scss';
import { buildPatentsListNavSnapshot } from './utils/patentsListNavSnapshot';
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
  } = usePatentListFilters();

  const { debouncedSearch, alignDebouncedWithQuery } = usePatentsListSearchDebounce(searchQuery);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const { skipNextListResetRef } = usePatentsListRestoreFromDetail(
    location,
    navigate,
    { setSearchQuery, alignDebouncedWithQuery },
    { setActiveTab, setAppliedFilters, setDraftFilters },
    { setPage, setPageSize },
  );

  const deletedScope = patentListTabToDeletedScope(activeTab);
  const serverFilters = usePatentsListServerFilters(debouncedSearch, appliedFilters);

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
  } = useReferenceData([
    'departments',
    'users',
    'contracts',
    'projects',
    'contractCategories',
    'patentStatuses',
    'patentIntellectProps',
    'patentAreas',
  ]);

  const refs = referenceBooks as ReferenceDataForPatents;
  const patents = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const tabCounts = listData?.tab_counts ?? { all: 0, active: 0, deleted: 0 };

  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, activeTab, resetPage]);

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
        patentsListReturn: buildPatentsListNavSnapshot(searchQuery, activeTab, appliedFilters, page, pageSize),
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
