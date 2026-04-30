import { FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Pagination, Spin } from 'antd';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { usePatentGrantsRegistry } from '../../../api/patents/patentGrantsApiHooks';
import type { PatentGrantRegistryListScope } from '../../../api/patents/patentGrantsApi';
import { BackButton } from '../../../components/backButton/BackButton';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { useResetServerPageUnlessSkipped } from '../../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import type { PatentGrant } from '../../../types/patent';
import { usePatentsListPaginationClamp } from '../../patents/hooks/usePatentsListPaginationClamp';
import { usePatentsListSearchDebounce } from '../../patents/hooks/usePatentsListSearchDebounce';
import patentListStyles from '../../patents/PatentsListPage.module.scss';
import {
  PATENT_GRANT_NAV_FROM_REGISTRY,
  PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY,
} from './navigation/patentGrantListNavigation';
import { PatentGrantListCard } from './components/PatentGrantListCard';
import { PatentGrantsRegistryFiltersBar } from './components/PatentGrantsRegistryFiltersBar';
import { PatentGrantsRegistryFiltersModal } from './components/PatentGrantsRegistryFiltersModal';
import { usePatentGrantsRegistryFilters } from './hooks/usePatentGrantsRegistryFilters';
import { usePatentGrantsRegistryRestoreFromDetail } from './hooks/usePatentGrantsRegistryRestoreFromDetail';
import { usePatentGrantsRegistryServerFilters } from './hooks/usePatentGrantsRegistryServerFilters';
import {
  loadPatentGrantsRegistryPersistedUi,
  savePatentGrantsRegistryPersistedUi,
} from './utils/patentGrantsRegistryPersistedUi';
import { buildPatentGrantsRegistryListSnapshot } from './utils/patentGrantsRegistryNavSnapshot';
import styles from './PatentGrantsListPage.module.scss';

const PERSIST_UI_DEBOUNCE_MS = 400;

const EMPTY_TAB_COUNTS: Record<PatentGrantRegistryListScope, number> = {
  all: 0,
  active: 0,
  other: 0,
};

export default function PatentGrantsRegistryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [grantScopeTab, setGrantScopeTab] = useState<PatentGrantRegistryListScope>('all');

  const {
    searchQuery,
    setSearchQuery,
    isFiltersModalOpen,
    openFiltersModal,
    closeFiltersModal,
    appliedFilters,
    setAppliedFilters,
    setDraftFilters,
    draftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  } = usePatentGrantsRegistryFilters();

  const { debouncedSearch, alignDebouncedWithQuery } = usePatentsListSearchDebounce(searchQuery);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const restoredFromNavigationRef = useRef(false);
  const { skipNextListResetRef } = usePatentGrantsRegistryRestoreFromDetail(
    location,
    navigate,
    { setSearchQuery, alignDebouncedWithQuery },
    { setGrantScopeTab, setAppliedFilters, setDraftFilters },
    { setPage, setPageSize },
    { restoredFromNavigationRef },
  );

  const canPersistRegistryUiRef = useRef(false);

  useLayoutEffect(() => {
    if (restoredFromNavigationRef.current) {
      restoredFromNavigationRef.current = false;
    } else {
      const persisted = loadPatentGrantsRegistryPersistedUi();
      if (persisted) {
        skipNextListResetRef.current = true;
        setSearchQuery(persisted.searchQuery);
        alignDebouncedWithQuery(persisted.searchQuery.trim());
        setGrantScopeTab(persisted.grantScopeTab);
        setAppliedFilters(persisted.appliedFilters);
        setDraftFilters(persisted.appliedFilters);
        setPage(persisted.page);
        setPageSize(persisted.pageSize);
      }
    }
    canPersistRegistryUiRef.current = true;
  }, []);

  const serverFilters = usePatentGrantsRegistryServerFilters(debouncedSearch, appliedFilters);

  const appliedFiltersResetKey = useMemo(
    () =>
      JSON.stringify({
        grantStatuses: [...appliedFilters.grantStatuses].sort(),
        grantRegionKeys: [...appliedFilters.grantRegionKeys].sort(),
        grantIssueYears: [...appliedFilters.grantIssueYears].sort((a, b) => a - b),
        grantRenewalYears: [...appliedFilters.grantRenewalYears].sort((a, b) => a - b),
      }),
    [appliedFilters],
  );

  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [
    debouncedSearch,
    grantScopeTab,
    appliedFiltersResetKey,
    resetPage,
  ]);

  useEffect(() => {
    if (!canPersistRegistryUiRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePatentGrantsRegistryPersistedUi({
        searchQuery,
        grantScopeTab,
        appliedFilters,
        page,
        pageSize,
      });
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, grantScopeTab, appliedFilters, page, pageSize]);

  const listQuery = useMemo(
    () => ({
      ...serverFilters,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      listScope: grantScopeTab,
    }),
    [page, pageSize, serverFilters, grantScopeTab],
  );

  const { data, isLoading, isError, isFetching } = usePatentGrantsRegistry(listQuery);
  const grants = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = data?.tab_counts ?? EMPTY_TAB_COUNTS;

  usePatentsListPaginationClamp({
    total,
    page,
    pageSize,
    isError,
    handleTableChange,
  });

  const handleOpenGrant = (grant: PatentGrant) => {
    navigate(`/patent-grants/${grant.id}`, {
      state: {
        from: PATENT_GRANT_NAV_FROM_REGISTRY,
        [PATENT_GRANTS_REGISTRY_RETURN_STATE_KEY]: buildPatentGrantsRegistryListSnapshot(
          searchQuery,
          grantScopeTab,
          appliedFilters,
          page,
          pageSize,
        ),
      },
    });
  };

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    });

  if (isError) {
    return <NotFound errorMessage='Не удалось загрузить реестр охранных документов' />;
  }

  const isInitialLoad = isLoading && !data;
  const paginationConfig = getPaginationConfig(total);
  const showPagination = total > 0;

  return (
    <div className={patentListStyles.wrap}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр охранных документов'
        titleWeight='medium'
        subtitle='учёт охранных документов'
        actions={
          <>
            <Button
              type='default'
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? patentListStyles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={patentListStyles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              onClick={() => navigate('/patent-grants/create', { state: { fromRegistry: true } })}
            >
              Добавить
            </Button>
          </>
        }
        filters={
          !isInitialLoad ? (
            <PatentGrantsRegistryFiltersBar
              activeTab={grantScopeTab}
              onTabChange={setGrantScopeTab}
              tabCounts={tabCounts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              shownCount={grants.length}
              totalCount={total}
            />
          ) : undefined
        }
      />

      <PatentGrantsRegistryFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={() => {
          applyFilters();
          resetPage();
        }}
        onReset={resetDraftFilters}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : grants.length === 0 ? (
        <div className={styles.empty}>Охранные документы не найдены</div>
      ) : (
        <>
          <div
            className={`${patentListStyles.cardList}${isFetching && !isLoading ? ` ${patentListStyles.cardListDimmed}` : ''}`}
          >
            <ReferenceBookCardList>
              {grants.map(grant => (
                <PatentGrantListCard key={grant.id} grant={grant} onClick={() => handleOpenGrant(grant)} />
              ))}
            </ReferenceBookCardList>
          </div>
          {showPagination ? (
            <div className={patentListStyles.pagination}>
              <Pagination
                current={paginationConfig.current}
                pageSize={paginationConfig.pageSize}
                total={paginationConfig.total}
                showSizeChanger
                pageSizeOptions={['20', '50', '100']}
                showTotal={(itemTotal, range) => `${range[0]}-${range[1]} из ${itemTotal}`}
                onChange={handlePageChange}
                onShowSizeChange={(_, nextSize) => handlePageChange(1, nextSize)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
