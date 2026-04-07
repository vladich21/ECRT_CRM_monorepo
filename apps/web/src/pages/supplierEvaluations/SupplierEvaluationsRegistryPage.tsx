import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import { partnerApi } from '../../api/partners/partnerApi';
import { partnerQueryKeys } from '../../api/partners/partnerQueryKeys';
import { useProjectsPreview } from '../../api/projects/projectApiHooks';
import {
  useDeleteSupplierEvaluation,
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useUsers } from '../../api/users/userApiHooks';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { formatSrmUserName } from '../../helpers/formatSrmUserName';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { useNotification } from '../../customhooks/useNotification';
import { mutedTagStyle } from '../../constants/statusBadgeSurfaces';
import type { SupplierEvaluationListItem, SupplierEvaluationUiStatusParam } from '../../types/supplierEvaluation';
import EvaluationExpandedContent from '../partners/evaluations/EvaluationExpandedContent';
import {
  CategoryTag,
  formatReevaluationCell,
  getRowUiStatus,
  scoreColor,
  statusBadgeLabel,
} from '../partners/evaluations/supplierEvaluationUi';
import listStyles from './EvaluationsListShared.module.scss';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  SupplierEvaluationsRegistryFiltersModal,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import registryStyles from './SupplierEvaluationsRegistryPage.module.scss';
import {
  EVALUATION_UI_TABS,
  evaluationRegistrySortToRequestParams,
  evaluationYearFilterToApi,
} from './supplierEvaluationsConstants';

const { Text } = Typography;

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_FETCH_LIMIT = 2000;

function countActiveRegistryFilters(f: EvaluationsRegistryAppliedFilters): number {
  let n = 0;
  if (f.evaluatedYear !== EMPTY_EVALUATIONS_REGISTRY_FILTERS.evaluatedYear) n += 1;
  if (f.category !== 'all') n += 1;
  if (f.createdByUserId) n += 1;
  return n;
}

export default function SupplierEvaluationsRegistryPage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const deleteMut = useDeleteSupplierEvaluation();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>('current');
  const [appliedListFilters, setAppliedListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [draftListFilters, setDraftListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);

  const { page, pageSize, handleTableChange, getPaginationConfig, resetPage } = useServerTablePagination({
    defaultPageSize: 20,
  });

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const isSearchMode = Boolean(debouncedSearch);

  const { data: projects = [] } = useProjectsPreview();
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name || p.code || p.id])),
    [projects],
  );

  const { data: partners = [] } = useQuery({
    queryKey: partnerQueryKeys.referenceList(),
    queryFn: () => partnerApi.getPartnersForReference(),
    staleTime: 5 * 60 * 1000,
  });
  const partnerNameById = useMemo(
    () => Object.fromEntries(partners.map(p => [p.id, p.short_name || p.name || p.id])),
    [partners],
  );

  const { data: usersResponse } = useUsers(2, true);
  const buyerOptions = useMemo(
    () =>
      (usersResponse?.data ?? []).map(u => ({
        value: u.id,
        label: formatSrmUserName(u),
      })),
    [usersResponse?.data],
  );

  const tabCountRequestParams = useMemo(
    () => ({
      evaluated_year: evaluationYearFilterToApi(appliedListFilters.evaluatedYear),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by: appliedListFilters.createdByUserId,
    }),
    [appliedListFilters],
  );

  const { data: tabCounts, isLoading: tabCountsLoading } = useSupplierEvaluationTabCounts(
    tabCountRequestParams,
    true,
  );

  const listParams = useMemo(() => {
    const base = {
      status: 'all' as const,
      ui_status: rowStatusTab === 'all' ? undefined : rowStatusTab,
      evaluated_year: evaluationYearFilterToApi(appliedListFilters.evaluatedYear),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by: appliedListFilters.createdByUserId,
      ...evaluationRegistrySortToRequestParams(appliedListFilters.sortPreset),
    };
    if (isSearchMode) {
      return { ...base, limit: SEARCH_FETCH_LIMIT, offset: 0 };
    }
    return { ...base, limit: pageSize, offset: (page - 1) * pageSize };
  }, [rowStatusTab, appliedListFilters, isSearchMode, page, pageSize]);

  const { data, isLoading, refetch } = useSupplierEvaluationsList(listParams, true);

  const activeFiltersCount = useMemo(() => countActiveRegistryFilters(appliedListFilters), [appliedListFilters]);

  const openFiltersModal = () => {
    setDraftListFilters(appliedListFilters);
    setIsFiltersModalOpen(true);
  };

  const closeFiltersModal = () => {
    setIsFiltersModalOpen(false);
  };

  const applyFiltersFromModal = () => {
    setAppliedListFilters(draftListFilters);
    setIsFiltersModalOpen(false);
    resetPage();
  };

  const resetFiltersFromModal = () => {
    setDraftListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
    setAppliedListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
    setIsFiltersModalOpen(false);
    resetPage();
  };

  const updateDraftListFilter = (patch: Partial<EvaluationsRegistryAppliedFilters>) => {
    setDraftListFilters(prev => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    resetPage();
  }, [rowStatusTab, appliedListFilters, debouncedSearch, resetPage]);

  const filteredRows = useMemo(() => {
    const rows = data?.data ?? [];
    const searchLowercase = debouncedSearch.toLowerCase();
    if (!searchLowercase) return rows;
    return rows.filter(row => {
      const partnerLabel = String(partnerNameById[row.partner_id] ?? '').toLowerCase();
      const projectLabel = String(projectNameById[row.project_id] ?? '').toLowerCase();
      return partnerLabel.includes(searchLowercase) || projectLabel.includes(searchLowercase);
    });
  }, [data?.data, debouncedSearch, partnerNameById, projectNameById]);

  const displayRows = useMemo(() => {
    if (!isSearchMode) return filteredRows;
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [isSearchMode, filteredRows, page, pageSize]);

  const total = isSearchMode ? filteredRows.length : (data?.total ?? 0);

  const columns: ColumnsType<SupplierEvaluationListItem> = [
    Table.EXPAND_COLUMN,
    {
      title: 'Контрагент',
      key: 'partner',
      ellipsis: true,
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, row) => (
        <Link to={`/partners/${row.partner_id}/evaluations`}>
          {partnerNameById[row.partner_id] ?? row.partner_id}
        </Link>
      ),
    },
    {
      title: 'Проект',
      key: 'project',
      ellipsis: { showTitle: true },
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, row) => <Text strong>{projectNameById[row.project_id] ?? row.project_id}</Text>,
    },
    {
      title: 'Дата оценки',
      dataIndex: 'evaluated_at',
      width: 118,
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (v: string) => <Text type='secondary'>{v ? v.split('-').reverse().join('.') : '—'}</Text>,
    },
    {
      title: 'Закупщик',
      key: 'buyer',
      width: 160,
      align: 'left',
      ellipsis: true,
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (_, row) => (
        <Text type='secondary'>{row.created_by_name?.trim() ? row.created_by_name : '—'}</Text>
      ),
    },
    {
      title: 'Категория',
      key: 'cat',
      width: 100,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (_, row) => <CategoryTag category={row.category} weightedScore={row.weighted_score} />,
    },
    {
      title: 'Балл',
      key: 'score',
      width: 88,
      align: 'right',
      onHeaderCell: () => ({ style: { textAlign: 'right' } }),
      render: (_, row) => (
        <Text strong style={{ color: scoreColor(row.weighted_score) }}>
          {Number(row.weighted_score).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Переоценка',
      key: 'reeval',
      width: 168,
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (_, row) => formatReevaluationCell(row, getRowUiStatus(row)),
    },
    {
      title: 'Статус',
      key: 'st',
      width: 132,
      align: 'left',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      render: (_, row) => {
        const rowPresentationState = getRowUiStatus(row);
        const { text, surface } = statusBadgeLabel(rowPresentationState);
        return <Tag bordered={false} style={mutedTagStyle(surface)}>{text}</Tag>;
      },
    },
    {
      title: '',
      key: 'actions',
      width: 52,
      align: 'center',
      fixed: 'right',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (_, row) => (
        <Button
          type='text'
          danger
          size='small'
          icon={<DeleteOutlined />}
          aria-label='Удалить оценку'
          onClick={() => {
            Modal.confirm({
              title: 'Удалить оценку?',
              content:
                'Запись будет удалена без восстановления. Связанные блокировки по этой оценке будут сняты.',
              okText: 'Удалить',
              okButtonProps: { danger: true },
              cancelText: 'Отмена',
              onOk: () =>
                new Promise<void>((resolve, reject) => {
                  deleteMut.mutate(row.id, {
                    onSuccess: () => {
                      showNotification('success', 'Оценка удалена');
                      void refetch();
                      resolve();
                    },
                    onError: () => {
                      showNotification('error', 'Не удалось удалить оценку');
                      reject();
                    },
                  });
                }),
            });
          }}
        />
      ),
    },
  ];

  return (
    <div className={listStyles.wrap}>
      {contextHolder}
      <BackButton path='/' />

      <PageHeader
        title='Реестр оценок поставщиков'
        subtitle='Все оценки по контрагентам и проектам'
        actions={
          <Button
            icon={<FilterOutlined />}
            onClick={openFiltersModal}
            className={activeFiltersCount > 0 ? registryStyles.filtersBtnActive : undefined}
          >
            Фильтры
            {activeFiltersCount > 0 && <span className={registryStyles.filtersBadge}>{activeFiltersCount}</span>}
          </Button>
        }
        filters={
          <div className={listStyles.filterSection}>
            <div className={listStyles.filterTabsRow}>
              <div className={listStyles.filterTabs}>
                {EVALUATION_UI_TABS.map(tab => (
                  <button
                    key={tab.key}
                    type='button'
                    className={`${listStyles.filterTab} ${rowStatusTab === tab.key ? listStyles.filterTabActive : ''}`}
                    onClick={() => setRowStatusTab(tab.key)}
                  >
                    {tab.label}{' '}
                    <span className={listStyles.filterTabCount}>
                      {tabCountsLoading ? '…' : (tabCounts?.[tab.key] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
              <div className={listStyles.filterTabsRight}>
                <Input
                  allowClear
                  className={listStyles.searchInTabsRow}
                  prefix={<SearchOutlined className={listStyles.searchIcon} />}
                  placeholder='Контрагент или проект…'
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
                <span className={listStyles.resultCount}>
                  Показано: <strong>{displayRows.length}</strong> из <strong>{total}</strong>
                </span>
              </div>
            </div>
          </div>
        }
      />

      <SupplierEvaluationsRegistryFiltersModal
        open={isFiltersModalOpen}
        draft={draftListFilters}
        onUpdateDraft={updateDraftListFilter}
        onClose={closeFiltersModal}
        onApply={applyFiltersFromModal}
        onReset={resetFiltersFromModal}
        buyerOptions={buyerOptions}
      />

      <div className={listStyles.tableCard} style={{ marginTop: 16 }}>
        <Table<SupplierEvaluationListItem>
          rowKey='id'
          loading={isLoading}
          columns={columns}
          dataSource={displayRows}
          tableLayout='fixed'
          scroll={{ x: 1200 }}
          pagination={{
            ...getPaginationConfig(total),
            className: listStyles.evaluationsTablePagination,
          }}
          onChange={pagination => handleTableChange(pagination)}
          expandable={{
            expandedRowRender: record => (
              <EvaluationExpandedContent
                row={record}
                partnerId={record.partner_id}
                onReevaluate={() => navigate(`/partners/${record.partner_id}/evaluations`)}
              />
            ),
            rowExpandable: () => true,
          }}
        />
      </div>
    </div>
  );
}
