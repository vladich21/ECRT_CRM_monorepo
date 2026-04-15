import { useEffect, useMemo } from 'react';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useLocation, useNavigate } from 'react-router-dom';

import { BackButton } from '../../components/backButton/BackButton';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import type { Partner } from '../../types/partner';
import { PartnerFiltersModal } from './PartnerFiltersModal';
import styles from './PartnersListPage.module.scss';
import { PARTNER_FILTER_TABS, type PartnerListTab } from './PartnersListPage.types';
import { usePartnersListData } from './hooks/usePartnersListData';
import { usePartnersListFilters } from './hooks/usePartnersListFilters';
import SupplierCard from './registry/SupplierCard';
import { buildPartnersApiFilters } from './utils/buildPartnersApiFilters';
import { toPartnerListDisplayPartner } from './utils/partnersListDisplayUtils';
import { buildPartnersListNavSnapshot, parsePartnersListNavSnapshot } from './utils/partnersListNavSnapshot';

const SEARCH_DEBOUNCE_MS = 350;

export default function PartnersListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    appliedFilters,
    setAppliedFilters,
    draftFilters,
    isFiltersOpen,
    openFiltersModal,
    closeFiltersModal,
    applyFilters: commitAppliedFilters,
    resetFilters: commitResetFilters,
    updateDraftFilter,
    activeFiltersCount,
    setDraftFilters,
  } = usePartnersListFilters();
  const [debouncedSearch, flushDebouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });
  const { skipNextListResetRef } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.partnersListReturn,
    parse: parsePartnersListNavSnapshot,
    applyParsed: restoredListState => {
      setSearchQuery(restoredListState.searchQuery);
      flushDebouncedSearch(restoredListState.searchQuery.trim());
      setActiveTab(restoredListState.activeTab);
      setAppliedFilters(restoredListState.appliedFilters);
      setDraftFilters(restoredListState.appliedFilters);
      setPage(restoredListState.page);
      setPageSize(restoredListState.pageSize);
    },
    applyFallback: navigationState => {
      if (navigationState.listTab != null) {
        setActiveTab(navigationState.listTab as PartnerListTab);
        return;
      }
      if (navigationState.deletionScope === 'deleted') setActiveTab('deleted');
    },
  });
  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, activeTab, resetPage]);
  const apiFilters = useMemo(
    () => buildPartnersApiFilters(debouncedSearch, activeTab, appliedFilters),
    [debouncedSearch, appliedFilters, activeTab],
  );
  const {
    partners,
    total,
    references,
    isInitialLoad,
    isLoading,
    isError,
    isFetching,
    isRefsError,
    partnerEvalKpiQueries,
    partnerInitialEvalQueries,
    getTabCount,
    filterOptions,
  } = usePartnersListData(apiFilters, page, pageSize, debouncedSearch, appliedFilters);

  const applyFilters = () => {
    commitAppliedFilters();
    resetPage();
  };
  const resetFilters = () => {
    commitResetFilters();
    resetPage();
  };

  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      const pagination: TablePaginationConfig = { current: maxPage, pageSize };
      handleTableChange(pagination);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);
  const handleCardClick = (partner: Partner) => {
    navigate(`/partners/${partner.id}`, {
      state: {
        from: 'partners-list',
        deletionScope: activeTab === 'deleted' ? ('deleted' as const) : undefined,
        partnersListReturn: buildPartnersListNavSnapshot(searchQuery, activeTab, appliedFilters, page, pageSize),
      },
    });
  };
  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    });
  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const paginationConfig = getPaginationConfig(total);
  return (
    <div className={styles.wrap}>
      <div className={styles.backRow}>
        <BackButton path='/' />
      </div>

      <PageHeader
        title='Реестр контрагентов'
        titleWeight='medium'
        subtitle='управление контрагентами'
        actions={
          <>
            <Button
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
              disabled={activeTab === 'deleted'}
              onClick={() => navigate('/partners/create')}
            >
              Добавить контрагента
            </Button>
          </>
        }
        filters={
          !isInitialLoad ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  {PARTNER_FILTER_TABS.map(({ key, label, hint }) => (
                    <button
                      key={key}
                      type='button'
                      title={hint}
                      className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}{' '}
                      <span className={styles.filterTabCount}>{getTabCount(key)}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input
                    className={styles.searchInTabsRow}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    placeholder='Поиск по названию или ИНН...'
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    allowClear
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{partners.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={`${styles.cardsList}${isFetching && !isLoading ? ` ${styles.cardsListDimmed}` : ''}`}>
          {partners.length === 0 ? (
            <div className={styles.emptyState}>
              {activeTab === 'deleted' ? 'Нет удалённых контрагентов' : 'Контрагенты не найдены'}
            </div>
          ) : (
            partners.map((partner, index) => (
              <SupplierCard
                key={partner.id}
                partner={toPartnerListDisplayPartner(partner, references)}
                references={references}
                evaluationKpi={partnerEvalKpiQueries[index]?.data}
                evaluationKpiLoading={Boolean(partnerEvalKpiQueries[index]?.isPending)}
                initialEvaluation={partnerInitialEvalQueries[index]?.data}
                initialEvaluationLoading={Boolean(partnerInitialEvalQueries[index]?.isPending)}
                onClick={handleCardClick}
              />
            ))
          )}
        </div>
      )}

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

      <PartnerFiltersModal
        open={isFiltersOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={applyFilters}
        onReset={resetFilters}
        selectOptions={filterOptions}
      />
    </div>
  );
}
