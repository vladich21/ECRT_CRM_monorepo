import { Button, Input, Pagination, Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useEffect } from 'react';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { useNotification } from '../../customhooks/useNotification';
import { Contract } from '../../types/contract';
import { useContracts } from '../../api/contracts/contractApiHooks';
import { isContractDraft } from './utils/contractStateUtils';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { BackButton } from '../../components/backButton/BackButton';
import { ContractCard } from './ContractCard';
import { ContractFiltersModal } from './ContractFiltersModal';
import {
  FILTER_TABS,
  type ContractListReferences,
} from './ContractsListPage.types';
import {
  filterByTab,
  filterByAdvanced,
  filterBySearch,
} from './filters/contractListFilters';
import { useContractListFilters } from './hooks/useContractListFilters';
import styles from './ContractsListPage.module.scss';

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
  const { partnerId } = useParams();
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

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();
  const { data, isLoading, isError } = useContracts(
    partnerId ? { partner_id: partnerId } : undefined,
    page,
    pageSize
  );
  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(['partners', 'contractStates', 'contractCategories']);

  const contracts = data?.data ?? [];
  const totalCount = data?.total ?? 0;
  const references = referenceBooks as ContractListReferences;

  const tabCounts = useMemo(
    () => ({
      all: contracts.length,
      active: contracts.filter((contract) => contract.is_active).length,
      draft: contracts.filter((contract) =>
        isContractDraft(contract.state_id, references?.contractStates)
      ).length,
      inactive: contracts.filter((contract) => !contract.is_active).length,
    }),
    [contracts, references?.contractStates]
  );

  const filteredContracts = useMemo(() => {
    const afterTab = filterByTab(
      contracts,
      activeTab,
      references?.contractStates
    );
    const afterAdvanced = filterByAdvanced(afterTab, appliedFilters);
    return filterBySearch(afterAdvanced, searchQuery, references);
  }, [contracts, activeTab, appliedFilters, searchQuery, references]);

  const selectOptions = useMemo(
    () => buildSelectOptions(references),
    [references]
  );

  const handleApplyFilters = () => {
    const result = applyFilters();
    if (!result.success && result.error) {
      showNotification('error', 'Ошибка', result.error);
    }
  };

  useEffect(() => {
    resetPage();
  }, [searchQuery, activeTab, appliedFilters, resetPage]);

  const handleContractClick = (contract: Contract) =>
    navigate(`/contracts/${contract.id}`, {
      state: { contract, from: 'contracts-list' },
    });

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isPageLoading = isRefsLoading || isLoading;
  const paginationConfig = getPaginationConfig(totalCount);

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton path="/" />

      <div className={styles.pageBlock}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderContainer}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Договоры</h1>
              <span className={styles.pageSubtitle}>
                Реестр договоров организации
              </span>
            </div>
            <div className={styles.pageHeaderRight}>
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
                  <span className={styles.filtersBadge}>
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
              <Button
                type="primary"
                onClick={() =>
                  navigate('/contracts/create', { state: { partnerId } })
                }
              >
                Новый договор
              </Button>
            </div>
          </div>
        </header>

        {!isPageLoading && (
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
                  Показано: <strong>{filteredContracts.length}</strong> из{' '}
                  <strong>{totalCount}</strong>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <ContractFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        onUpdateDraftFilter={updateDraftFilter}
        onClose={closeFiltersModal}
        onApply={handleApplyFilters}
        onReset={resetDraftFilters}
        selectOptions={selectOptions}
      />

      {isPageLoading ? (
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      ) : filteredContracts.length === 0 ? (
        <div className={styles.empty}>Нет договоров</div>
      ) : (
        <>
          <div className={styles.cardList}>
            {filteredContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
                refs={references}
                onClick={handleContractClick}
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
