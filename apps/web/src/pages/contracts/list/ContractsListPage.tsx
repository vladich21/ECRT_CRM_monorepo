import { Button, Input, Pagination, Spin } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { Contract } from '../../../types/contract';
import { useContracts } from '../../../api/contracts/contractApiHooks';
import type { ContractsListParams } from '../../../api/contracts/contractApi';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { BackButton } from '../../../components/backButton/BackButton';
import { ContractCard } from './ContractCard';
import { ContractFiltersModal } from './ContractFiltersModal';
import {
  FILTER_TABS,
  type ContractListReferences,
} from './ContractsListPage.types';
import { useContractListFilters } from '../hooks/useContractListFilters';
import styles from './ContractsListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

function validateAmountFilters(filters: {
  amountMin: number | null;
  amountMax: number | null;
}): string | null {
  if (
    filters.amountMin != null &&
    filters.amountMax != null &&
    filters.amountMin > filters.amountMax
  ) {
    return 'Минимальная сумма не может быть больше максимальной';
  }
  return null;
}

function buildSelectOptions(references: ContractListReferences) {
  return {
    partners: (references?.partners ?? []).map((partner) => ({
      label: partner.name,
      value: partner.id,
    })),
    categories: (references?.contractCategories ?? []).map((category) => ({
      label: category.name,
      value: category.id,
    })),
    states: (references?.contractStates ?? []).map((state) => ({
      label: state.name,
      value: state.id,
    })),
  };
}

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
    draftFilters,
    updateDraftFilter,
    applyFilters,
    resetDraftFilters,
    activeFiltersCount,
  } = useContractListFilters({
    validateFilters: validateAmountFilters,
  });

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();

  const effectivePartnerId = partnerIdFromRoute ?? appliedFilters.partnerId ?? undefined;

  const apiFilters = useMemo((): ContractsListParams => {
    const base: ContractsListParams = {
      partner_id: effectivePartnerId || undefined,
      search: debouncedSearch || undefined,
      list_tab: activeTab,
    };
    if (appliedFilters.categoryId) {
      base.category_id = appliedFilters.categoryId;
    }
    if (appliedFilters.stateId) {
      base.state_id = appliedFilters.stateId;
    }
    if (appliedFilters.dateRange?.[0] && appliedFilters.dateRange?.[1]) {
      base.date_from = appliedFilters.dateRange[0].format('YYYY-MM-DD');
      base.date_to = appliedFilters.dateRange[1].format('YYYY-MM-DD');
    }
    if (appliedFilters.amountMin != null) {
      base.amount_min = appliedFilters.amountMin;
    }
    if (appliedFilters.amountMax != null) {
      base.amount_max = appliedFilters.amountMax;
    }
    return base;
  }, [effectivePartnerId, debouncedSearch, activeTab, appliedFilters]);

  const {
    data,
    isLoading,
    isError,
    isFetching,
  } = useContracts(apiFilters, page, pageSize);

  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(['partners', 'contractStates', 'contractCategories']);

  const contracts = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = data?.tab_counts ?? {
    all: 0,
    active: 0,
    draft: 0,
    inactive: 0,
  };
  const references = referenceBooks as ContractListReferences;

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, activeTab, appliedFilters, resetPage]);

  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize } as never);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);

  const selectOptions = useMemo(
    () => buildSelectOptions(references),
    [references],
  );

  const handleApplyFilters = () => {
    const result = applyFilters();
    if (!result.success && result.error) {
      showNotification('error', 'Ошибка', result.error);
    }
  };

  const handleContractClick = (contract: Contract) =>
    navigate(`/contracts/${contract.id}`, {
      state: { contract, from: location.pathname },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isInitialLoad = isRefsLoading || (isLoading && !data);
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      {contextHolder}
      {!partnerIdFromRoute && <BackButton path="/" />}

      <PageHeader
        title="Договоры"
        subtitle="Реестр договоров организации"
        actions={
          <>
            <Button type="default">Экспорт</Button>
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
              onClick={() =>
                navigate('/contracts/create', { state: { partnerId: partnerIdFromRoute } })
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
                    placeholder="Поиск по номеру, названию, партнёру..."
                    allowClear
                    enterButton={false}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                  <span className={styles.resultCount}>
                    Показано: <strong>{contracts.length}</strong> из{' '}
                    <strong>{total}</strong>
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
          <Spin size="large" />
        </div>
      ) : (
        <div
          className={`${styles.cardList}${
            isFetching && !isLoading ? ` ${styles.cardListDimmed}` : ''
          }`}
        >
          {contracts.length === 0 ? (
            <div className={styles.empty}>Нет договоров</div>
          ) : (
            contracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                refs={references}
                onClick={handleContractClick}
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
    </div>
  );
}
