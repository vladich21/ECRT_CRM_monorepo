import { useCallback, useMemo, useState } from 'react';
import {
  AppstoreOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Alert, Button, Checkbox, Dropdown, Empty, Input, Pagination, Segmented, Space, Spin, Table } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { EMPTY_PURCHASE_REQUEST_TAB_COUNTS } from '@/api/procurement/requests/procurementRequestApi';
import { usePurchaseRequestsList } from '@/api/procurement/requests/procurementRequestApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { openFromRegistry, useRegistryScroll } from '@/hooks/registryScroll';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  useResetPageWhenListQueryChanges,
  useServerPaginationClamp,
  useServerTablePagination,
} from '@/hooks/useServerTablePagination';
import { SECTIONS } from '@/shared/permissions';

import { usePurchaseRequestsListUiState } from './hooks/usePurchaseRequestsListUiState';
import { incomeCreatePath } from './incomeContracts';
import { PurchaseRequestCard } from './PurchaseRequestCard';
import { PurchaseRequestFromIncomeModal } from './PurchaseRequestFromIncomeModal';
import { purchaseRequestListColumns } from './PurchaseRequestsListColumns';
import {
  DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS,
  PURCHASE_REQUEST_LIST_COLUMN_KEYS,
  PURCHASE_REQUEST_LIST_COLUMN_LABELS,
  PURCHASE_REQUEST_LIST_LOCKED_COLUMNS,
  normalizePurchaseRequestListColumns,
  type PurchaseRequestListColumnKey,
} from './purchaseRequestListColumns';
import { PURCHASE_REQUEST_LIST_TABS, type PurchaseRequestListTab } from './purchaseRequestLabels';
import styles from './PurchaseRequestsListPage.module.scss';
import type { PurchaseRequestsListView } from './utils/purchaseRequestsListPersistedUi';

const SEARCH_DEBOUNCE_MS = 350;

export default function PurchaseRequestsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PurchaseRequestListTab>('all');
  const [view, setView] = useState<PurchaseRequestsListView>('cards');
  const [visibleColumns, setVisibleColumns] = useState<PurchaseRequestListColumnKey[]>(
    DEFAULT_PURCHASE_REQUEST_LIST_COLUMNS,
  );
  const [fromIncomeOpen, setFromIncomeOpen] = useState(false);
  const [debouncedSearch, flushDebouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);

  const { page, pageSize, setPage, setPageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination({ defaultPageSize: 20 });

  const persistedUi = useMemo(
    () => ({ searchQuery, activeTab, page, pageSize, view, visibleColumns }),
    [searchQuery, activeTab, page, pageSize, view, visibleColumns],
  );

  const { restoreToken, flushPersist } = usePurchaseRequestsListUiState(
    location,
    navigate,
    {
      setSearchQuery,
      flushDebouncedSearch,
      setActiveTab,
      setPage,
      setPageSize,
      setView,
      setVisibleColumns,
    },
    persistedUi,
  );

  const listParams = useMemo(
    () => ({
      status: activeTab === 'all' ? undefined : activeTab,
      search: debouncedSearch.trim() || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [activeTab, debouncedSearch, page, pageSize],
  );

  const queryResetKey = useMemo(
    () => JSON.stringify({ status: listParams.status, search: listParams.search }),
    [listParams.status, listParams.search],
  );

  useResetPageWhenListQueryChanges(queryResetKey, resetPage, restoreToken);

  const { data, isLoading, isError, isFetching, refetch } = usePurchaseRequestsList(listParams);
  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = data?.tab_counts ?? EMPTY_PURCHASE_REQUEST_TAB_COUNTS;
  const visibleSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);
  const tableColumns = useMemo(() => purchaseRequestListColumns(visibleSet), [visibleSet]);

  useServerPaginationClamp({
    total,
    page,
    pageSize,
    disabled: isError,
    handleTableChange,
  });

  const isInitialLoad = isLoading && !data;
  useRegistryScroll({
    isListReady: !isInitialLoad && !isFetching,
    page,
    restoreToken,
  });

  const openCard = useCallback(
    (id: string) => {
      flushPersist();
      openFromRegistry(location, navigate, `/procurement/requests/${id}`);
    },
    [flushPersist, location, navigate],
  );

  const openCreate = () => {
    flushPersist();
    navigate('/procurement/requests/create');
  };

  const openFromIncome = () => {
    flushPersist();
    setFromIncomeOpen(true);
  };

  const confirmFromIncome = (payload: { contractId: string; stageId?: string }) => {
    setFromIncomeOpen(false);
    navigate(incomeCreatePath(payload.contractId, payload.stageId));
  };

  const toggleColumn = (key: PurchaseRequestListColumnKey, checked: boolean) => {
    const next = checked ? [...visibleColumns, key] : visibleColumns.filter(column => column !== key);
    setVisibleColumns(normalizePurchaseRequestListColumns(next));
  };

  const hasActiveQuery = Boolean(listParams.search) || activeTab !== 'all';
  const paginationConfig = getPaginationConfig(total);

  return (
    <div className={styles.wrap}>
      <BackButton path='/' />
      <PageHeader
        title='Запросы на закупку'
        subtitle='Оформление потребности'
        actions={
          <CanAccess section={SECTIONS.PROCUREMENT_REQUESTS} action='edit'>
            <Button onClick={openFromIncome}>На основании доходного</Button>
            <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
              Создать
            </Button>
          </CanAccess>
        }
        filters={
          <div className={styles.filterSection}>
            <div className={styles.filterTabsRow}>
              <div className={styles.filterTabs}>
                {PURCHASE_REQUEST_LIST_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type='button'
                    className={`${styles.filterTab} ${activeTab === tab.key ? styles.filterTabActive : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}{' '}
                    <span className={styles.filterTabCount}>{tabCounts[tab.key]}</span>
                  </button>
                ))}
              </div>
              <div className={styles.filterTabsRight}>
                <Input
                  allowClear
                  className={styles.searchInTabsRow}
                  prefix={<SearchOutlined className={styles.searchIcon} />}
                  placeholder='Номер, предмет или инициатор...'
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                />
                <Segmented
                  value={view}
                  onChange={value => setView(value as PurchaseRequestsListView)}
                  options={[
                    { value: 'cards', icon: <AppstoreOutlined />, title: 'Карточки' },
                    { value: 'table', icon: <UnorderedListOutlined />, title: 'Таблица' },
                  ]}
                />
                <Dropdown
                  trigger={['click']}
                  dropdownRender={() => (
                    <div className={styles.columnMenu} onClick={event => event.stopPropagation()}>
                      {PURCHASE_REQUEST_LIST_COLUMN_KEYS.map(key => {
                        const locked = PURCHASE_REQUEST_LIST_LOCKED_COLUMNS.includes(key);
                        return (
                          <label key={key} className={styles.columnMenuItem}>
                            <Checkbox
                              checked={visibleSet.has(key)}
                              disabled={locked}
                              onChange={event => toggleColumn(key, event.target.checked)}
                            >
                              {PURCHASE_REQUEST_LIST_COLUMN_LABELS[key]}
                            </Checkbox>
                          </label>
                        );
                      })}
                    </div>
                  )}
                >
                  <Button icon={<SettingOutlined />}>Колонки</Button>
                </Dropdown>
                <span className={styles.resultCount}>
                  Показано: <strong>{rows.length}</strong> из <strong>{total}</strong>
                </span>
              </div>
            </div>
          </div>
        }
      />

      {isError ? (
        <Alert
          type='error'
          showIcon
          style={{ marginTop: 16 }}
          message='Не удалось загрузить запросы'
          action={
            <Button size='small' onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      ) : isInitialLoad ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : rows.length === 0 ? (
        <div className={styles.empty}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={hasActiveQuery ? 'Ничего не найдено' : 'Запросов нет'}
          >
            {!hasActiveQuery ? (
              <CanAccess section={SECTIONS.PROCUREMENT_REQUESTS} action='edit'>
                <Space>
                  <Button onClick={openFromIncome}>На основании доходного</Button>
                  <Button type='primary' icon={<PlusOutlined />} onClick={openCreate}>
                    Создать запрос
                  </Button>
                </Space>
              </CanAccess>
            ) : null}
          </Empty>
        </div>
      ) : (
        <>
          {view === 'table' ? (
            <div className={`${styles.tableWrap}${isFetching && !isLoading ? ` ${styles.listDimmed}` : ''}`}>
              <Table
                rowKey='id'
                size='small'
                pagination={false}
                columns={tableColumns}
                dataSource={rows}
                onRow={row => ({
                  onClick: () => openCard(row.id),
                })}
                rowClassName={row => (row.is_urgent ? styles.urgentRow : '')}
              />
            </div>
          ) : (
            <div className={`${styles.cardList}${isFetching && !isLoading ? ` ${styles.listDimmed}` : ''}`}>
              {rows.map(row => (
                <PurchaseRequestCard
                  key={row.id}
                  request={row}
                  visibleColumns={visibleSet}
                  onClick={openCard}
                />
              ))}
            </div>
          )}
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
      {fromIncomeOpen ? (
        <PurchaseRequestFromIncomeModal
          open
          onCancel={() => setFromIncomeOpen(false)}
          onConfirm={confirmFromIncome}
        />
      ) : null}
    </div>
  );
}
