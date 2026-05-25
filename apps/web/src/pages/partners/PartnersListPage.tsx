import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  CloudSyncOutlined,
  ExportOutlined,
  FilterOutlined,
  PlusOutlined,
  SearchOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { Button, Input, Pagination, Select, Spin } from 'antd';
import type { TablePaginationConfig } from 'antd/es/table';
import { useLocation, useNavigate } from 'react-router-dom';

import { BackButton } from '../../components/backButton/BackButton';
import { NotFound } from '../../components/notFound/NotFound';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { getListScrollY, useListScrollRestoration } from '../../hooks/useListScrollRestoration';
import { useListReturnFromDetail, useResetServerPageUnlessSkipped } from '../../hooks/useListReturnFromDetail';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { useNotification } from '../../customhooks/useNotification';
import type { PartnerListSortBy } from '../../api/partners/partnerApi';
import { usePartnerSyncNow, usePartnerSyncStatus } from '../../api/partners/partnerApiHooks';
import type { Partner } from '../../types/partner';
import { PartnerFiltersModal } from './PartnerFiltersModal';
import { PartnerExportModal } from './components/export/PartnerExportModal';
import { buildPartnersApiFilters } from './utils/buildPartnersApiFilters';
import { toPartnerListDisplayPartner } from './utils/partnersListDisplayUtils';
import { buildPartnersListNavSnapshot, parsePartnersListNavSnapshot } from './utils/partnersListNavSnapshot';
import { loadPartnersListPersistedUi, savePartnersListPersistedUi } from './utils/partnersListPersistedUi';
import {
  isPartnerCreateRestricted,
  PARTNER_CREATE_RESTRICTED_MESSAGE,
} from './utils/partnerCreateRestriction';
import styles from './PartnersListPage.module.scss';
import { usePartnersListData } from './hooks/usePartnersListData';
import { usePartnersListFilters } from './hooks/usePartnersListFilters';
import SupplierCard from './registry/SupplierCard';

const SEARCH_DEBOUNCE_MS = 350;
const PERSIST_UI_DEBOUNCE_MS = 400;
const PARTNERS_LIST_SCOPE_TAB_LABEL = 'Все контрагенты';

const SORT_OPTIONS: { value: PartnerListSortBy; label: string }[] = [
  { value: 'name', label: 'По названию' },
  { value: 'created_at', label: 'По дате создания' },
  { value: 'weighted_score', label: 'По оценке' },
  { value: 'next_reevaluation_date', label: 'По дате переоценки' },
  { value: 'status_name', label: 'По статусу' },
];

export default function PartnersListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const partnerSyncNowMutation = usePartnerSyncNow();
  const { data: partnerSyncStatus } = usePartnerSyncStatus();
  const {
    searchQuery,
    setSearchQuery,
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
    sortBy,
    sortOrder,
    setSortField,
    toggleSortOrder,
    restoreListSorting,
  } = usePartnersListFilters();
  const [debouncedSearch, flushDebouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const isCreateRestricted = isPartnerCreateRestricted();
  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });
  const restoredFromNavigationRef = useRef(false);
  const canPersistPartnersListUiRef = useRef(false);
  const { skipNextListResetRef, pendingScrollY } = useListReturnFromDetail({
    location,
    navigate,
    getRawSnapshot: navigationState => navigationState.partnersListReturn,
    parse: parsePartnersListNavSnapshot,
    applyParsed: restoredListState => {
      restoredFromNavigationRef.current = true;
      setSearchQuery(restoredListState.searchQuery);
      flushDebouncedSearch(restoredListState.searchQuery.trim());
      setAppliedFilters(restoredListState.appliedFilters);
      setDraftFilters(restoredListState.appliedFilters);
      setPage(restoredListState.page);
      setPageSize(restoredListState.pageSize);
      restoreListSorting({ sortBy: restoredListState.sortBy, sortOrder: restoredListState.sortOrder });
      savePartnersListPersistedUi({
        searchQuery: restoredListState.searchQuery,
        appliedFilters: restoredListState.appliedFilters,
        page: restoredListState.page,
        pageSize: restoredListState.pageSize,
        sortBy: restoredListState.sortBy,
        sortOrder: restoredListState.sortOrder,
      });
    },
    applyFallback: navigationState => {
      if (navigationState.listTab === 'deleted' || navigationState.deletionScope === 'deleted') {
        restoredFromNavigationRef.current = true;
        setAppliedFilters(prev => ({ ...prev, isDeleted: 'yes' }));
        setDraftFilters(prev => ({ ...prev, isDeleted: 'yes' }));
        return;
      }
      if (navigationState.listTab === 'ready') {
        restoredFromNavigationRef.current = true;
        setAppliedFilters(prev => ({ ...prev, isApproved: 'yes' }));
        setDraftFilters(prev => ({ ...prev, isApproved: 'yes' }));
        return;
      }
      if (navigationState.listTab === 'in_progress') {
        restoredFromNavigationRef.current = true;
        setAppliedFilters(prev => ({ ...prev, isApproved: 'no' }));
        setDraftFilters(prev => ({ ...prev, isApproved: 'no' }));
      }
    },
  });
  useLayoutEffect(() => {
    if (restoredFromNavigationRef.current) {
      restoredFromNavigationRef.current = false;
    } else {
      const persisted = loadPartnersListPersistedUi();
      if (persisted) {
        skipNextListResetRef.current = true;
        setSearchQuery(persisted.searchQuery);
        flushDebouncedSearch(persisted.searchQuery.trim());
        setAppliedFilters(persisted.appliedFilters);
        setDraftFilters(persisted.appliedFilters);
        setPage(persisted.page);
        setPageSize(persisted.pageSize);
        restoreListSorting({ sortBy: persisted.sortBy, sortOrder: persisted.sortOrder });
      }
    }
    canPersistPartnersListUiRef.current = true;
  }, []);
  useResetServerPageUnlessSkipped(skipNextListResetRef, resetPage, [debouncedSearch, appliedFilters, resetPage]);
  const apiFilters = useMemo(
    () => buildPartnersApiFilters(debouncedSearch, appliedFilters, sortBy, sortOrder),
    [debouncedSearch, appliedFilters, sortBy, sortOrder],
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
    filterOptions,
  } = usePartnersListData(apiFilters, page, pageSize);

  useEffect(() => {
    if (!canPersistPartnersListUiRef.current) return;
    const timeoutId = window.setTimeout(() => {
      savePartnersListPersistedUi({
        searchQuery,
        appliedFilters,
        page,
        pageSize,
        sortBy,
        sortOrder,
      });
    }, PERSIST_UI_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchQuery, appliedFilters, page, pageSize, sortBy, sortOrder]);

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
        deletionScope: partner.is_deleted ? ('deleted' as const) : undefined,
        partnersListReturn: buildPartnersListNavSnapshot(
          searchQuery,
          appliedFilters,
          page,
          pageSize,
          sortBy,
          sortOrder,
          getListScrollY(),
        ),
      },
    });
  };
  const handlePageChange = (newPage: number, newPageSize?: number) =>
    handleTableChange({
      current: newPage,
      pageSize: newPageSize ?? pageSize,
    });

  const isListReady = !isInitialLoad && !isFetching;
  useListScrollRestoration({ pendingScrollY, isListReady });

  if (isRefsError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const paginationConfig = getPaginationConfig(total);
  return (
    <div className={styles.wrap}>
      {contextHolder}
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
              icon={<CloudSyncOutlined />}
              loading={partnerSyncNowMutation.isPending}
              onClick={() => {
                partnerSyncNowMutation.mutate(undefined, {
                  onSuccess: res => {
                    const summary =
                      `Загружено из Тезиса: ${res.loadedFromThesis}. ` +
                      `Создано: ${res.created}. Привязано: ${res.linked}. ` +
                      `Уже синхронизировано: ${res.skippedByThesisId}.`;
                    if (res.errors.length > 0) {
                      showNotification(
                        'warning',
                        'Синхронизация контрагентов завершена с предупреждениями',
                        `${summary} Ошибок: ${res.errors.length} (см. логи сервера).`,
                      );
                    } else {
                      showNotification('success', 'Синхронизация контрагентов завершена', summary);
                    }
                  },
                  onError: (error: unknown) => {
                    const responseError = error as { response?: { data?: { message?: unknown } } };
                    const messageRaw = responseError.response?.data?.message;
                    const message =
                      typeof messageRaw === 'string'
                        ? messageRaw
                        : error instanceof Error
                          ? error.message
                          : 'Не удалось выполнить синхронизацию';
                    showNotification('error', 'Ошибка синхронизации контрагентов', message);
                  },
                });
              }}
            >
              Синхронизировать из Тезиса
            </Button>
            <Button
              icon={<FilterOutlined />}
              onClick={openFiltersModal}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 && <span className={styles.filtersBadge}>{activeFiltersCount}</span>}
            </Button>
            <Button
              icon={<ExportOutlined />}
              onClick={() => setIsExportModalOpen(true)}
              disabled={isInitialLoad}
            >
              Экспорт
            </Button>
            {isCreateRestricted ? (
              <span className={styles.createRestrictedHint}>{PARTNER_CREATE_RESTRICTED_MESSAGE}</span>
            ) : (
              <Button
                type='primary'
                icon={<PlusOutlined />}
                disabled={appliedFilters.isDeleted === 'yes'}
                onClick={() => navigate('/partners/create')}
              >
                Добавить контрагента
              </Button>
            )}
          </>
        }
        filters={
          !isInitialLoad ? (
            <div className={styles.filterSection}>
              <div className={styles.filterTabsRow}>
                <div className={styles.filterTabs}>
                  <span className={styles.filterTabScopeLabel}>
                    {PARTNERS_LIST_SCOPE_TAB_LABEL}{' '}
                    <span className={styles.filterTabCount}>{isFetching ? '…' : total}</span>
                  </span>
                </div>
                <div className={styles.filterTabsRight}>
                  <Select<PartnerListSortBy>
                    className={styles.sortSelect}
                    value={sortBy}
                    options={SORT_OPTIONS}
                    onChange={value => {
                      setSortField(value);
                      resetPage();
                    }}
                    popupMatchSelectWidth={false}
                  />
                  <Button
                    type='default'
                    icon={<SortAscendingOutlined />}
                    title={sortOrder === 'asc' ? 'По возрастанию' : 'По убыванию'}
                    onClick={() => {
                      toggleSortOrder();
                      resetPage();
                    }}
                    className={styles.sortDirBtn}
                  >
                    {sortOrder === 'asc' ? 'A→Я' : 'Я→A'}
                  </Button>
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
                  {partnerSyncStatus?.updated_at ? (
                    <span className={styles.syncStatusHint}>
                      Последняя синхронизация:{' '}
                      {new Date(partnerSyncStatus.updated_at).toLocaleString('ru-RU')}
                    </span>
                  ) : null}
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
              {appliedFilters.isDeleted === 'yes' ? 'Нет удаленных контрагентов' : 'Контрагенты не найдены'}
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

      <PartnerExportModal
        open={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        exportFilters={apiFilters}
        references={references ?? {}}
      />
    </div>
  );
}
