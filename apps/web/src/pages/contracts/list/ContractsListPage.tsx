import { useMemo } from 'react';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { BackButton } from '@/components/backButton/BackButton';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useNotification } from '@/customhooks/useNotification';
import { getListScrollY, useListScrollRestoration, useScrollToTopOnPageChange } from '@/hooks/useListScrollRestoration';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '@/hooks/useServerTablePagination';
import { Contract } from '@/types/contract';
import { useContractListFilters } from '../hooks/useContractListFilters';
import { useContractsListUiState } from '../hooks/useContractsListUiState';
import { buildContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';
import { useContractsListData } from './hooks/useContractsListData';
import { buildContractsApiFilters } from './utils/buildContractsApiFilters';
import { buildContractsListQueryResetKey } from './utils/contractsListQueryResetKey';
import { validateAmountFilters } from './utils/contractListFilterValidators';
import { ContractCard } from './ContractCard';
import { ContractFiltersModal } from './ContractFiltersModal';
import styles from './ContractsListPage.module.scss';
import { FILTER_TABS } from './ContractsListPage.types';

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

  const [debouncedSearch, flushDebouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const { restoreToken, pendingScrollY } = useContractsListUiState(location, navigate, {
    setSearchQuery,
    flushDebouncedSearch,
    setActiveTab,
    setAppliedFilters,
    setDraftFilters,
    setPage,
    setPageSize,
  });

  const effectivePartnerId = partnerIdFromRoute ?? appliedFilters.partnerId ?? undefined;

  const queryResetKey = useMemo(
    () =>
      buildContractsListQueryResetKey({
        debouncedSearch,
        activeTab,
        appliedFilters,
        routePartnerId: partnerIdFromRoute,
      }),
    [debouncedSearch, activeTab, appliedFilters, partnerIdFromRoute],
  );

  useResetPageWhenListQueryChanges(queryResetKey, resetPage, restoreToken);

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

  useServerPaginationClamp({
    total,
    page,
    pageSize,
    disabled: isRefsError || isError,
    handleTableChange,
  });

  const handleApplyFilters = () => {
    const result = applyFilters();
    if (!result.success && result.error) {
      showNotification('error', 'Ошибка', result.error);
    }
  };

  const handleContractClick = (contract: Contract) =>
    navigate(`/contracts/${contract.id}`, {
      state: {
        contract,
        from: location.pathname,
        deletionScope: activeTab === 'deleted' ? ('deleted' as const) : undefined,
        contractsListReturn: buildContractsListNavSnapshot(
          searchQuery,
          activeTab,
          appliedFilters,
          page,
          pageSize,
          getListScrollY(),
        ),
      },
    });

  const isListReady = !isInitialLoad && !isFetching;
  useListScrollRestoration({ pendingScrollY, isListReady });
  useScrollToTopOnPageChange(page, restoreToken);

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      {contextHolder}
      {!partnerIdFromRoute && <BackButton path='/' />}

      <PageHeader
        title='Реестр договоров'
        subtitle='управление договорами'
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
              onClick={() =>
                navigate('/contracts/create', {
                  state: {
                    partnerId: partnerIdFromRoute,
                    returnPath: partnerIdFromRoute
                      ? `/partners/${partnerIdFromRoute}/contracts`
                      : undefined,
                  },
                })
              }
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
            <div className={styles.empty}>{activeTab === 'deleted' ? 'Нет удаленных договоров' : 'Нет договоров'}</div>
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
    </div>
  );
}
