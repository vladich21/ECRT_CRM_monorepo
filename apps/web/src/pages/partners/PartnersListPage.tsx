import { useMemo, useState, useEffect } from 'react';
import { Button, Input, Pagination, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { NotFound } from '../../components/notFound/NotFound';
import { useReferenceData } from '../../api/hooks/useReferences';
import { usePartners } from '../../api/partners/partnerApiHooks';
import SupplierCard from './registry/SupplierCard';
import { PartnerFiltersModal, type PartnerFilters, EMPTY_FILTERS } from './PartnerFiltersModal';
import type { Partner } from '../../types/partner';
import { PARTNER_FILTER_TABS, type PartnerListTab } from './PartnersListPage.types';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import styles from './PartnersListPage.module.scss';

const SEARCH_DEBOUNCE_MS = 350;

export default function PartnersListPage() {
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<PartnerListTab>('all');

  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchQuery]);

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });

  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
      statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
      competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
      readiness: activeTab,
    }),
    [debouncedSearch, appliedFilters, activeTab],
  );

  const {
    data: partnersData,
    isLoading,
    isError,
    isFetching,
  } = usePartners(apiFilters, page, pageSize);

  const { data: references, isError: isRefsError, isLoading: isRefsLoading } = useReferenceData([
    'partnerTypes',
    'partnerStatuses',
    'competencies',
  ]);

  const partners = partnersData?.data ?? [];
  const total = partnersData?.total ?? 0;
  const tabCounts = partnersData?.tab_counts ?? {
    all: 0,
    ready: 0,
    in_progress: 0,
    key_supplier: 0,
  };

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

  const filterOptions = useMemo(
    () => ({
      types: (references?.partnerTypes ?? []).map((type) => ({ label: type.name, value: String(type.id) })),
      statuses: (references?.partnerStatuses ?? []).map((status) => ({
        label: status.name,
        value: String(status.id),
      })),
      competencies: (references?.competencies ?? []).map((competence) => ({
        label: competence.name,
        value: String(competence.id),
      })),
    }),
    [references],
  );

  const activeFiltersCount =
    (appliedFilters.typeIds.length > 0 ? 1 : 0) +
    (appliedFilters.statusIds.length > 0 ? 1 : 0) +
    (appliedFilters.competenceIds.length > 0 ? 1 : 0);

  const openFiltersModal = () => {
    setDraftFilters(appliedFilters);
    setIsFiltersOpen(true);
  };
  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setIsFiltersOpen(false);
    resetPage();
  };
  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setIsFiltersOpen(false);
    resetPage();
  };

  const handleCardClick = (partner: Partner) => {
    navigate(`/partners/${partner.id}`, { state: { from: 'partners-list' } });
  };

  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    } as never);

  if (isRefsError || isError) {
    return <NotFound errorMessage="Не удалось выполнить запрос" />;
  }

  const isInitialLoad = isRefsLoading || (isLoading && !partnersData);
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <div className={styles.backRow}>
        <BackButton path="/" />
      </div>

      <PageHeader
        title="Реестр контрагентов"
        subtitle="Управление поставщиками и подрядчиками"
        actions={
          <>
            <Button
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={styles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/partners/create')}>
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
                      type="button"
                      title={hint}
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
                  <Input
                    className={styles.searchInTabsRow}
                    prefix={<SearchOutlined className={styles.searchIcon} />}
                    placeholder="Поиск по названию или ИНН..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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
          <Spin size="large" />
        </div>
      ) : (
        <div
          className={`${styles.cardsList}${isFetching && !isLoading ? ` ${styles.cardsListDimmed}` : ''}`}
        >
          {partners.length === 0 ? (
            <div className={styles.emptyState}>Контрагенты не найдены</div>
          ) : (
            partners.map((partner) => (
              <SupplierCard
                key={partner.id}
                partner={partner}
                references={references}
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
        onUpdateDraftFilter={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onClose={() => setIsFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        selectOptions={filterOptions}
      />
    </div>
  );
}
