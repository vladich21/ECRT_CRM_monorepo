import { useEffect, useMemo, useState } from 'react';
import { Input, Select, Table, Tag, Typography } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import { partnerApi } from '../../api/partners/partnerApi';
import { useProjectsPreview } from '../../api/projects/projectApiHooks';
import {
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useUsers } from '../../api/users/userApiHooks';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { formatSrmUserName } from '../../helpers/formatSrmUserName';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
  SupplierEvaluationSortDir,
  SupplierEvaluationSortField,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';
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
  EVALUATION_CATEGORY_FILTER_OPTIONS,
  EVALUATION_UI_TABS,
  EVALUATION_YEAR_FILTER_ALL,
  EVALUATION_YEAR_OPTIONS,
  evaluationYearFilterToApi,
} from './supplierEvaluationsConstants';

const { Text } = Typography;

const SEARCH_DEBOUNCE_MS = 350;
const SEARCH_FETCH_LIMIT = 2000;

type EvaluationRegistrySortPreset =
  | 'evaluated_at_desc'
  | 'evaluated_at_asc'
  | 'weighted_score_asc'
  | 'weighted_score_desc';

const EVALUATION_REGISTRY_SORT_OPTIONS: { value: EvaluationRegistrySortPreset; label: string }[] = [
  { value: 'evaluated_at_desc', label: 'Сначала новые по дате' },
  { value: 'evaluated_at_asc', label: 'Сначала старые по дате' },
  { value: 'weighted_score_asc', label: 'Балл: слабые сверху' },
  { value: 'weighted_score_desc', label: 'Балл: сильные сверху' },
];

function evaluationRegistrySortToRequestParams(preset: EvaluationRegistrySortPreset): {
  sort_field?: SupplierEvaluationSortField;
  sort_dir?: SupplierEvaluationSortDir;
} {
  switch (preset) {
    case 'evaluated_at_desc':
      return { sort_field: 'evaluated_at', sort_dir: 'desc' };
    case 'evaluated_at_asc':
      return { sort_field: 'evaluated_at', sort_dir: 'asc' };
    case 'weighted_score_asc':
      return { sort_field: 'weighted_score', sort_dir: 'asc' };
    case 'weighted_score_desc':
      return { sort_field: 'weighted_score', sort_dir: 'desc' };
  }
}

export default function SupplierEvaluationsRegistryPage() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>('current');
  const [evaluatedYearFilter, setEvaluatedYearFilter] = useState<string>(EVALUATION_YEAR_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<'all' | SupplierEvaluationCategory>('all');
  const [createdByUserId, setCreatedByUserId] = useState<string | undefined>(undefined);
  const [listSortPreset, setListSortPreset] = useState<EvaluationRegistrySortPreset>('evaluated_at_desc');

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
    queryKey: ['partners', 'reference'],
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
      evaluated_year: evaluationYearFilterToApi(evaluatedYearFilter),
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
    }),
    [evaluatedYearFilter, categoryFilter, createdByUserId],
  );

  const { data: tabCounts, isLoading: tabCountsLoading } = useSupplierEvaluationTabCounts(
    tabCountRequestParams,
    true,
  );

  const listParams = useMemo(() => {
    const base = {
      status: 'all' as const,
      ui_status: rowStatusTab === 'all' ? undefined : rowStatusTab,
      evaluated_year: evaluationYearFilterToApi(evaluatedYearFilter),
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
      ...evaluationRegistrySortToRequestParams(listSortPreset),
    };
    if (isSearchMode) {
      return { ...base, limit: SEARCH_FETCH_LIMIT, offset: 0 };
    }
    return { ...base, limit: pageSize, offset: (page - 1) * pageSize };
  }, [
    rowStatusTab,
    evaluatedYearFilter,
    categoryFilter,
    createdByUserId,
    isSearchMode,
    listSortPreset,
    page,
    pageSize,
  ]);

  const { data, isLoading } = useSupplierEvaluationsList(listParams, true);

  useEffect(() => {
    resetPage();
  }, [rowStatusTab, evaluatedYearFilter, categoryFilter, createdByUserId, debouncedSearch, listSortPreset, resetPage]);

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
      render: (_, row) => (
        <Link to={`/partners/${row.partner_id}/evaluations`}>
          {partnerNameById[row.partner_id] ?? row.partner_id}
        </Link>
      ),
    },
    {
      title: 'Проект',
      key: 'project',
      render: (_, row) => <Text strong>{projectNameById[row.project_id] ?? row.project_id}</Text>,
    },
    {
      title: 'Дата оценки',
      dataIndex: 'evaluated_at',
      width: 110,
      render: (v: string) => <Text type='secondary'>{v ? v.split('-').reverse().join('.') : '—'}</Text>,
    },
    {
      title: 'Закупщик',
      key: 'buyer',
      width: 140,
      ellipsis: true,
      render: (_, row) => (
        <Text type='secondary'>{row.created_by_name?.trim() ? row.created_by_name : '—'}</Text>
      ),
    },
    {
      title: 'Кат.',
      key: 'cat',
      width: 56,
      align: 'center',
      render: (_, row) => <CategoryTag category={row.category} />,
    },
    {
      title: 'Балл',
      key: 'score',
      width: 80,
      align: 'right',
      render: (_, row) => (
        <Text strong style={{ color: scoreColor(row.weighted_score) }}>
          {Number(row.weighted_score).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Переоценка',
      key: 'reeval',
      width: 150,
      render: (_, row) => formatReevaluationCell(row, getRowUiStatus(row)),
    },
    {
      title: 'Статус',
      key: 'st',
      width: 140,
      render: (_, row) => {
        const rowPresentationState = getRowUiStatus(row);
        const { text, color } = statusBadgeLabel(rowPresentationState);
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <div className={listStyles.wrap} style={{ padding: '0 24px 24px' }}>
      <BackButton path='/' />

      <PageHeader
        title='Реестр оценок поставщиков'
        subtitle='Все оценки по контрагентам и проектам'
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
                    {tab.label}
                    <span style={{ opacity: 0.72, fontWeight: 500 }}>
                      {' · '}
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
                <Select
                  placeholder='Период'
                  value={evaluatedYearFilter}
                  onChange={setEvaluatedYearFilter}
                  style={{ minWidth: 140 }}
                  options={EVALUATION_YEAR_OPTIONS}
                />
                <Select<'all' | SupplierEvaluationCategory>
                  value={categoryFilter}
                  onChange={v => setCategoryFilter(v)}
                  style={{ minWidth: 200 }}
                  options={EVALUATION_CATEGORY_FILTER_OPTIONS}
                />
                <Select
                  allowClear
                  showSearch
                  placeholder='Закупщик'
                  optionFilterProp='label'
                  value={createdByUserId}
                  onChange={v => setCreatedByUserId(v)}
                  style={{ minWidth: 220 }}
                  options={buyerOptions}
                />
                <Select<EvaluationRegistrySortPreset>
                  value={listSortPreset}
                  onChange={v => setListSortPreset(v)}
                  style={{ minWidth: 220 }}
                  options={EVALUATION_REGISTRY_SORT_OPTIONS}
                />
              </div>
            </div>
          </div>
        }
      />

      <div className={listStyles.tableCard} style={{ marginTop: 16 }}>
        <Table<SupplierEvaluationListItem>
          rowKey='id'
          loading={isLoading}
          columns={columns}
          dataSource={displayRows}
          scroll={{ x: 1100 }}
          pagination={getPaginationConfig(total)}
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
