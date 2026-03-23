import { useMemo, useState, useEffect } from 'react';
import { Button, Input, Pagination, Spin } from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../hooks/useListReturnFromDetail';
import { EMPTY_DELETION_TAB_COUNTS, type DeletionScope } from '../../constants/deletionScope';
import { buildPartnersListNavSnapshot, parsePartnersListNavSnapshot } from './utils/partnersListNavSnapshot';
import styles from './PartnersListPage.module.scss';
const SEARCH_DEBOUNCE_MS = 350;
export default function PartnersListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<PartnerListTab>('all');
  const [appliedFilters, setAppliedFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<PartnerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });
  const { skipNextListResetRef } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.partnersListReturn,
    parse: parsePartnersListNavSnapshot,
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
        setActiveTab(navigationState.listTab as PartnerListTab);
        return;
      }
      if (navigationState.deletionScope === 'deleted') setActiveTab('deleted');
    },
  });
  useEffect(() => {
    const debounceTimerId = window.setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(debounceTimerId);
  }, [searchQuery]);
  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, activeTab, resetPage]);
  const apiFilters = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
      statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
      competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
      readiness: (activeTab === 'deleted' ? 'all' : activeTab) as 'all' | 'ready' | 'in_progress',
      deletedScope: (activeTab === 'deleted' ? 'deleted' : 'all') as DeletionScope,
    }),
    [debouncedSearch, appliedFilters, activeTab],
  );
  const { data: partnersData, isLoading, isError, isFetching } = usePartners(apiFilters, page, pageSize);
  const {
    data: references,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies']);
  const partners = partnersData?.data ?? [];
  const total = partnersData?.total ?? 0;
  const tabCounts = partnersData?.tab_counts ?? {
    all: 0,
    ready: 0,
    in_progress: 0,
    key_supplier: 0,
  };
  const deletionTabCounts = partnersData?.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS;
  useEffect(() => {
    if (isRefsError || isError) return;
    const maxPage = Math.max(1, Math.ceil(total / pageSize) || 1);
    if (page > maxPage) {
      handleTableChange({ current: maxPage, pageSize } as never);
    }
  }, [total, pageSize, page, isRefsError, isError, handleTableChange]);
  const filterOptions = useMemo(
    () => ({
      types: (references?.partnerTypes ?? []).map(type => ({ label: type.name, value: String(type.id) })),
      statuses: (references?.partnerStatuses ?? []).map(status => ({
        label: status.name,
        value: String(status.id),
      })),
      competencies: (references?.competencies ?? []).map(competence => ({
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
  const updateDraftFilter = (patch: Partial<PartnerFilters>) => {
    setDraftFilters(prev => ({ ...prev, ...patch }));
  };
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
    } as never);
  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const isInitialLoad = isRefsLoading || (isLoading && !partnersData);
  const paginationConfig = getPaginationConfig(total);
  return (
    <div className={styles.wrap}>
      <div className={styles.backRow}>
        <BackButton path='/' />
      </div>

      <PageHeader
        title='Реестр контрагентов'
        subtitle='Управление поставщиками и подрядчиками'
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
                      <span className={styles.filterTabCount}>
                        {key === 'deleted' ? deletionTabCounts.deleted : tabCounts[key]}
                      </span>
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
            partners.map(partner => (
              <SupplierCard key={partner.id} partner={partner} references={references} onClick={handleCardClick} />
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
        onClose={() => setIsFiltersOpen(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        selectOptions={filterOptions}
      />
    </div>
  );
}
