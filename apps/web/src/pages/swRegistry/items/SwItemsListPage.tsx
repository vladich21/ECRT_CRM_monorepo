import { useMemo, useState } from 'react';
import { ExportOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Alert, Button, Pagination, Spin } from 'antd';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import {
  useCreateSwItem,
  useRestoreSwItem,
  useSwItems,
  useSwReferences,
  useSwStructure,
} from '@/api/swRegistry/swRegistryApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { openFromRegistry, useRegistryScroll } from '@/hooks/registryScroll';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '@/hooks/useServerTablePagination';
import { SECTIONS } from '@/shared/permissions';
import type { CreateSwItemPayload, SwItemListRow, SwItemsTabCounts } from '@/types/swRegistry';
import { SwItemCard } from './SwItemCard';
import { SwItemCreateModal } from './SwItemCreateModal';
import { SwItemsFiltersModal } from './SwItemsFiltersModal';
import { SwItemsListFiltersBar } from './SwItemsListFiltersBar';
import { resolveSwRegistryBackPath, readSwRegistryReturnState } from '../shared/swRegistryNavigation';
import styles from './SwItemsListPage.module.scss';
import {
  DEFAULT_SW_ITEMS_FILTERS,
  type SwItemsAdvancedFilters,
  type SwItemsFilterTab,
} from './SwItemsListPage.types';

const SEARCH_DEBOUNCE_MS = 350;
const EMPTY_TAB_COUNTS: SwItemsTabCounts = { all: 0, rnd: 0, serial: 0, purchased: 0, archived: 0 };

function readInitialTab(searchParams: URLSearchParams): SwItemsFilterTab {
  const dk = searchParams.get('developmentKind');
  if (dk === 'rnd' || dk === 'serial' || dk === 'purchased') return dk;
  return 'all';
}

export default function SwItemsListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SwItemsFilterTab>(() => readInitialTab(searchParams));
  const [createOpen, setCreateOpen] = useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<SwItemsAdvancedFilters>(() => ({
    elementId: searchParams.get('elementId') ?? undefined,
    partnerId: searchParams.get('partnerId') ?? undefined,
  }));
  const [draftFilters, setDraftFilters] = useState<SwItemsAdvancedFilters>(appliedFilters);
  const [debouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const documentStatus = searchParams.get('documentStatus') ?? undefined;
  const sheetStatus = searchParams.get('sheetStatus') ?? undefined;
  const listReturnFrom = readSwRegistryReturnState(location.state).from;
  const hasSummaryDrill = Boolean(documentStatus || sheetStatus);
  const listBackPath = resolveSwRegistryBackPath({ from: listReturnFrom, hasSummaryDrill, fallback: '/' });

  const { page, pageSize, setPage, getPaginationConfig, handleTableChange, resetPage } = useServerTablePagination({
    defaultPageSize: 50,
  });

  const kindsQuery = useSwReferences('developmentKinds');
  const statusesQuery = useSwReferences('statuses');
  const structureQuery = useSwStructure('active');
  const { data: refData } = useReferenceData(['partners']);
  const createMut = useCreateSwItem();
  const restoreMut = useRestoreSwItem();

  const elementId = appliedFilters.elementId;
  const partnerId = appliedFilters.partnerId;
  const developmentKind = activeTab === 'all' || activeTab === 'archived' ? undefined : activeTab;
  const recordState = activeTab === 'archived' ? 'archived' : 'active';

  const listParams = useMemo(
    () => ({
      elementId,
      partnerId,
      developmentKind,
      recordState,
      documentStatus,
      sheetStatus,
      q: debouncedSearch || undefined,
      page,
      limit: pageSize,
    }),
    [elementId, partnerId, developmentKind, recordState, documentStatus, sheetStatus, debouncedSearch, page, pageSize],
  );

  const queryResetKey = useMemo(
    () => `${elementId ?? ''}|${partnerId ?? ''}|${activeTab}|${documentStatus ?? ''}|${sheetStatus ?? ''}|${debouncedSearch}`,
    [elementId, partnerId, activeTab, documentStatus, sheetStatus, debouncedSearch],
  );
  useResetPageWhenListQueryChanges(queryResetKey, resetPage);

  const itemsQuery = useSwItems(listParams);
  const isInitialLoad = itemsQuery.isLoading && !itemsQuery.data;
  const isFetching = itemsQuery.isFetching;

  useServerPaginationClamp({
    total: itemsQuery.data?.total ?? 0,
    page,
    pageSize,
    disabled: itemsQuery.isError,
    handleTableChange,
  });

  useRegistryScroll({
    isListReady: !isInitialLoad && !isFetching,
    page,
    restoreToken: 0,
  });

  const kindByCode = useMemo(
    () => new Map((kindsQuery.data ?? []).map(k => [k.code, k.name])),
    [kindsQuery.data],
  );
  const statusByCode = useMemo(
    () => new Map((statusesQuery.data ?? []).map(s => [s.code, s.name])),
    [statusesQuery.data],
  );
  const tabCounts = itemsQuery.data?.tabCounts ?? EMPTY_TAB_COUNTS;
  const partnerOptions = useMemo(
    () => (refData?.partners ?? []).map(p => ({ value: p.id, label: p.name })),
    [refData?.partners],
  );

  const activeFiltersCount = Number(Boolean(appliedFilters.partnerId)) + Number(Boolean(appliedFilters.elementId));

  const openItem = (item: SwItemListRow) => {
    // Программа открывается в структуре: панель с комплектом, файлами и связями с РИД.
    openFromRegistry(location, navigate, `/sw/structure?elementId=${item.element.id}&itemId=${item.id}`, {
      state: { from: `${location.pathname}${location.search}` },
    });
  };

  const submitCreate = (payload: CreateSwItemPayload) => {
    createMut.mutate(payload, {
      onSuccess: data => {
        if (data.warnings?.length) message.warning(data.warnings.join(' '));
        else message.success('Программа создана');
        setCreateOpen(false);
      },
      onError: err => message.error(getApiErrorMessage(err) ?? 'Не удалось создать программу'),
    });
  };

  const handleRestore = (item: SwItemListRow) => {
    restoreMut.mutate(item.id, {
      onSuccess: () => message.success('Программа возвращена из архива'),
      onError: err => message.error(getApiErrorMessage(err) ?? 'Не удалось восстановить программу'),
    });
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    const next = new URLSearchParams(searchParams);
    if (draftFilters.elementId) next.set('elementId', draftFilters.elementId);
    else next.delete('elementId');
    setSearchParams(next, { replace: true });
    setIsFiltersModalOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters(DEFAULT_SW_ITEMS_FILTERS);
  };

  if (itemsQuery.isError) {
    return <NotFound errorMessage='Не удалось загрузить реестр программ' />;
  }

  const items = itemsQuery.data?.items ?? [];
  const total = itemsQuery.data?.total ?? 0;
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <BackButton path={listBackPath} />

      <PageHeader
        title='Реестр программного обеспечения'
        titleWeight='medium'
        subtitle='учет программ и программной документации по ЕСПД'
        actions={
          <>
            <Button
              type='default'
              icon={<FilterOutlined />}
              onClick={() => {
                setDraftFilters(appliedFilters);
                setIsFiltersModalOpen(true);
              }}
              className={activeFiltersCount > 0 ? styles.filtersBtnActive : undefined}
            >
              Фильтры
              {activeFiltersCount > 0 ? <span className={styles.filtersBadge}>{activeFiltersCount}</span> : null}
            </Button>
            <Button
              type='default'
              icon={<ExportOutlined />}
              disabled={isInitialLoad}
              onClick={() => message.info('Выгрузка в XLSX будет доступна в следующей версии')}
            >
              Экспорт
            </Button>
            <CanAccess section={SECTIONS.SW_ITEMS} action='edit'>
              <Button
                type='primary'
                icon={<PlusOutlined />}
                disabled={activeTab === 'archived'}
                onClick={() => setCreateOpen(true)}
              >
                Зарегистрировать ПО
              </Button>
            </CanAccess>
          </>
        }
        filters={
          !isInitialLoad ? (
            <SwItemsListFiltersBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              tabCounts={tabCounts}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              shownCount={items.length}
              totalCount={total}
            />
          ) : undefined
        }
      />

      <SwItemsFiltersModal
        open={isFiltersModalOpen}
        draftFilters={draftFilters}
        structureTree={structureQuery.data ?? []}
        partnerOptions={partnerOptions}
        onUpdateDraftFilter={patch => setDraftFilters(prev => ({ ...prev, ...patch }))}
        onClose={() => setIsFiltersModalOpen(false)}
        onApply={applyFilters}
        onReset={resetDraftFilters}
      />

      {documentStatus ? (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 12 }}
          message={`Фильтр из свода: документы в статусе «${statusByCode.get(documentStatus) ?? documentStatus}»`}
          action={
            <Button
              size='small'
              type='link'
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('documentStatus');
                setSearchParams(next, { replace: true });
              }}
            >
              Сбросить
            </Button>
          }
        />
      ) : null}

      {sheetStatus ? (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 12 }}
          message={`Фильтр из свода: листы утверждения в статусе «${statusByCode.get(sheetStatus) ?? sheetStatus}»`}
          action={
            <Button
              size='small'
              type='link'
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('sheetStatus');
                setSearchParams(next, { replace: true });
              }}
            >
              Сбросить
            </Button>
          }
        />
      ) : null}

      {isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>
          {activeTab === 'archived' ? 'Архивных программ нет' : 'Программ пока нет'}
        </div>
      ) : (
        <>
          <div className={`${styles.cardList}${isFetching && !isInitialLoad ? ` ${styles.cardListDimmed}` : ''}`}>
            {items.map(item => (
              <SwItemCard
                key={item.id}
                item={item}
                kindLabel={kindByCode.get(item.developmentKindCode)}
                statusLabels={statusByCode}
                onClick={openItem}
                onRestore={activeTab === 'archived' ? handleRestore : undefined}
                restoreLoading={restoreMut.isPending && restoreMut.variables === item.id}
              />
            ))}
          </div>
          {(paginationConfig.total ?? 0) > 0 ? (
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
          ) : null}
        </>
      )}

      <SwItemCreateModal
        open={createOpen}
        defaultElementId={elementId}
        confirmLoading={createMut.isPending}
        onCancel={() => setCreateOpen(false)}
        onSubmit={submitCreate}
      />
    </div>
  );
}
