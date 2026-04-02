import { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { FilterOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input, Pagination, Spin } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { partnerApi } from '../../api/partners/partnerApi';
import { usePartners } from '../../api/partners/partnerApiHooks';
import { fetchPartnerSupplierEvalKpi, supplierEvaluationApi } from '../../api/supplierEvaluations/supplierEvaluationApi';
import { getPartnerInitialEvalQueryKey, getPartnerSupplierEvalKpiQueryKey } from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { BackButton } from '../../components/backButton/BackButton';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { EMPTY_DELETION_TAB_COUNTS, type DeletionScope } from '../../constants/deletionScope';
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import type { Partner } from '../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../utils/partnerApproval';
import { EMPTY_FILTERS, PartnerFiltersModal, type PartnerFilters } from './PartnerFiltersModal';
import styles from './PartnersListPage.module.scss';
import { PARTNER_FILTER_TABS, type PartnerListTab } from './PartnersListPage.types';
import SupplierCard from './registry/SupplierCard';
import { buildPartnersListNavSnapshot, parsePartnersListNavSnapshot } from './utils/partnersListNavSnapshot';

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
      deletedScope: (activeTab === 'deleted' ? 'deleted' : 'active') as DeletionScope,
    }),
    [debouncedSearch, appliedFilters, activeTab],
  );
  const { data: partnersData, isLoading, isError, isFetching } = usePartners(apiFilters, page, pageSize);
  const tabCountQueries = useQueries({
    queries: PARTNER_FILTER_TABS.map(({ key }) => ({
      queryKey: ['partners', 'tab-count', key, debouncedSearch.trim(), appliedFilters],
      queryFn: async () => {
        const filters = {
          search: debouncedSearch.trim() || undefined,
          typeIds: appliedFilters.typeIds.length > 0 ? appliedFilters.typeIds : undefined,
          statusIds: appliedFilters.statusIds.length > 0 ? appliedFilters.statusIds : undefined,
          competenceIds: appliedFilters.competenceIds.length > 0 ? appliedFilters.competenceIds : undefined,
          readiness: (key === 'deleted' ? 'all' : key) as 'all' | 'ready' | 'in_progress',
          deletedScope: (key === 'deleted' ? 'deleted' : 'active') as DeletionScope,
        };
        const response = await partnerApi.getPartners(filters, 1, 0);
        return response.total;
      },
      staleTime: 15 * 1000,
    })),
  });
  const {
    data: references,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies', 'partnerCategories']);
  const partners = partnersData?.data ?? [];
  const total = partnersData?.total ?? 0;

  const isInitialLoad = isRefsLoading || (isLoading && !partnersData);
  const partnerEvalKpiQueries = useQueries({
    queries: partners.map(partner => ({
      queryKey: getPartnerSupplierEvalKpiQueryKey(partner.id),
      queryFn: () => fetchPartnerSupplierEvalKpi(partner.id),
      staleTime: 60 * 1000,
      enabled: !isInitialLoad && partners.length > 0,
    })),
  });
  const partnerInitialEvalQueries = useQueries({
    queries: partners.map(partner => ({
      queryKey: getPartnerInitialEvalQueryKey(partner.id),
      queryFn: () => supplierEvaluationApi.getActiveInitial(partner.id),
      staleTime: 60 * 1000,
      enabled: !isInitialLoad && partners.length > 0,
    })),
  });
  const tabCounts = partnersData?.tab_counts ?? {
    all: 0,
    ready: 0,
    in_progress: 0,
    key_supplier: 0,
  };
  const deletionTabCounts = partnersData?.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS;
  const getTabCount = (tabKey: PartnerListTab) => {
    const tabIndex = PARTNER_FILTER_TABS.findIndex(tab => tab.key === tabKey);
    const queriedTotal = tabIndex >= 0 ? tabCountQueries[tabIndex]?.data : undefined;
    if (typeof queriedTotal === 'number') return queriedTotal;
    return tabKey === 'deleted' ? deletionTabCounts.deleted : tabCounts[tabKey];
  };
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
              (() => {
                const categoryName =
                  references?.partnerCategories?.find(category => String(category.id) === String(partner.category_id))
                    ?.name ?? null;
                const approvedByRules = computePartnerIsApproved({
                  kind: inferPartnerCategoryKind(categoryName),
                  legalCheckPassed: Boolean(partner.legal_check_passed),
                  questionnaireFilled: Boolean(partner.questionnaire_filled),
                  initialAssessmentDone: Boolean(partner.initial_assessment_done),
                  hasActiveSupplierEvaluationBlock: Boolean(partner.has_active_evaluation_block),
                });
                const displayPartner: Partner = { ...partner, is_approved: approvedByRules };
                return (
              <SupplierCard
                key={partner.id}
                partner={displayPartner}
                references={references}
                evaluationKpi={partnerEvalKpiQueries[index]?.data}
                evaluationKpiLoading={Boolean(partnerEvalKpiQueries[index]?.isPending)}
                initialEvaluation={partnerInitialEvalQueries[index]?.data}
                initialEvaluationLoading={Boolean(partnerInitialEvalQueries[index]?.isPending)}
                onClick={handleCardClick}
              />
                );
              })()
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
