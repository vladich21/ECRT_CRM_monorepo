import { useEffect, useMemo, useState } from 'react';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { BackButton } from '../../../components/backButton/BackButton';
import { NotFound } from '../../../components/notFound/NotFound';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { Contract } from '../../../types/contract';
import { useContractListFilters } from '../hooks/useContractListFilters';
import { buildContractsListNavSnapshot, parseContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';
import { useContractsListData } from './hooks/useContractsListData';
import { buildContractsApiFilters } from './utils/buildContractsApiFilters';
import { validateAmountFilters } from './utils/contractListFilterValidators';
import { ContractCard } from './ContractCard';
import { ContractFiltersModal } from './ContractFiltersModal';
import styles from './ContractsListPage.module.scss';
import { FILTER_TABS, type FilterTab } from './ContractsListPage.types';

const SEARCH_DEBOUNCE_MS = 350;
export default function ContractsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { partnerId: partnerIdFromRoute } = useParams();
  const { contextHolder, showNotification } = useNotification();
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
  } = useContractListFilters({
    validateFilters: validateAmountFilters,
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const debounceTimerId = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const { skipNextListResetRef } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.contractsListReturn,
    parse: parseContractsListNavSnapshot,
    applyParsed: restoredListState => {
      setSearchQuery(restoredListState.searchQuery);
      setDebouncedSearch(restoredListState.searchQuery.trim());
      setActiveTab(restoredListState.activeTab);
      setAppliedFilters(restoredListState.appliedFilters);
      setDraftFilters(restoredListState.appliedFilters);
      setPage(restoredListState.page);
      setPageSize(restoredListState.pageSize);
    },
    applyFallback: navigationState => {
      if (navigationState.listTab != null) {
        setActiveTab(navigationState.listTab as FilterTab);
        return;
      }
      if (navigationState.deletionScope === 'deleted') setActiveTab('deleted');
    },
  });

  const effectivePartnerId = partnerIdFromRoute ?? appliedFilters.partnerId ?? undefined;
  const apiFilters = useMemo(
    () => buildContractsApiFilters({ effectivePartnerId, debouncedSearch, activeTab, appliedFilters }),
    [effectivePartnerId, debouncedSearch, activeTab, appliedFilters],
  );
  const {
    contracts,
    total,
    tabCounts,
    deletedTabCount,
    references,
    selectOptions,
    isInitialLoad,
    isLoading,
    isError,
    isFetching,
    isRefsError,
  } = useContractsListData(apiFilters, page, pageSize);
  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, activeTab, resetPage]);
  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize } as never);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);

  const handleApplyFilters = () => {
    const result = applyFilters();
    if (!result.success && result.error) {
      showNotification('error', 'Ошибка', result.error);
      return;
    }
    resetPage();
  };

  const handleContractClick = (contract: Contract) =>
    navigate(`/contracts/${contract.id}`, {
      state: {
        contract,
        from: location.pathname,
        deletionScope: activeTab === 'deleted' ? ('deleted' as const) : undefined,
        contractsListReturn: buildContractsListNavSnapshot(searchQuery, activeTab, appliedFilters, page, pageSize),
      },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      {contextHolder}
      {!partnerIdFromRoute && <BackButton path='/' />}

      <PageHeader
        title='Договоры'
        subtitle='Реестр договоров организации'
        actions={
          <>
            <Button type='default'>Экспорт</Button>
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
              disabled={activeTab === 'deleted'}
              onClick={() => navigate('/contracts/create', { state: { partnerId: partnerIdFromRoute } })}
            >
              Новый договор
            </Button>
          </>
        }
        filters={
          !isInitialLoad ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  {FILTER_TABS.map(({ key, label }) => (
                    <button
                      key={key}
                      type='button'
                      className={`${styles.filterTab}${activeTab === key ? ` ${styles.filterTabActive}` : ''}`}
                      onClick={() => setActiveTab(key)}
                    >
                      {label}{' '}
                      <span className={styles.filterTabCount}>
                        {key === 'deleted' ? deletedTabCount : tabCounts[key]}
                      </span>
                    </button>
                  ))}
                </div>
                <div className={styles.filterTabsRight}>
                  <Input.Search
                    className={styles.searchInTabsRow}
                    placeholder='Поиск по номеру, названию, контрагенту...'
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{contracts.length}</strong> из <strong>{total}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : undefined
        }
      />

      <ContractFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={handleApplyFilters}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : (
        <div className={`${styles.cardList}${isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''}`}>
          {contracts.length === 0 ? (
            <div className={styles.empty}>{activeTab === 'deleted' ? 'Нет удалённых договоров' : 'Нет договоров'}</div>
          ) : (
            contracts.map(contract => (
              <ContractCard key={contract.id} contract={contract} refs={references} onClick={handleContractClick} />
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
    </div>
  );
}
