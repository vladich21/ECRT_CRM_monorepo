import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';

import { partnerApi } from '../../api/partners/partnerApi';
import { partnerQueryKeys } from '../../api/partners/partnerQueryKeys';
import { useProjectsPreview } from '../../api/projects/projectApiHooks';
import {
  useDeleteSupplierEvaluation,
  useSupplierEvaluationRegistryCreators,
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { invalidateSupplierEvaluationQueries } from '../../api/supplierEvaluations/supplierEvaluationQueryKeys';
import { BackButton } from '../../components/backButton/BackButton';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';
import { useNotification } from '../../customhooks/useNotification';
import { mutedTagStyle } from '../../constants/statusBadgeSurfaces';
import type {
  SupplierEvaluationListItem,
  SupplierEvaluationUiStatusParam,
} from '../../types/supplierEvaluation';
import EvaluationExpandedContent from '../partners/evaluations/EvaluationExpandedContent';
import NewSupplierEvaluationModal from '../partners/evaluations/NewSupplierEvaluationModal';
import {
  CategoryTag,
  formatEvaluationScoreDisplay,
  formatReevaluationCell,
  getRowUiStatus,
  scoreColor,
  statusBadgeLabel,
} from '../partners/evaluations/supplierEvaluationUi';
import listStyles from './EvaluationsListShared.module.scss';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  SupplierEvaluationsRegistryFiltersModal,
  countActiveRegistryFilters,
  type EvaluationsRegistryAppliedFilters,
} from './SupplierEvaluationsRegistryFiltersModal';
import registryStyles from './SupplierEvaluationsRegistryPage.module.scss';
import {
  EVALUATION_UI_TABS,
  evaluationRegistrySortToRequestParams,
  evaluationYearsToApiParam,
} from './supplierEvaluationsConstants';
import {
  SUPPLIER_EVALUATIONS_REGISTRY_PARTNER_LINK_STATE,
  SUPPLIER_EVALUATIONS_REGISTRY_SEARCH_DEBOUNCE_MS,
  loadSupplierEvaluationsRegistryPersistedUi,
  saveSupplierEvaluationsRegistryPersistedUi,
} from './supplierEvaluationsRegistry.model';

const { Text } = Typography;

export default function SupplierEvaluationsRegistryPage() {
  const queryClient = useQueryClient();
  const { showNotification, contextHolder } = useNotification();
  const deleteMut = useDeleteSupplierEvaluation();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const persistedUi = useMemo(() => loadSupplierEvaluationsRegistryPersistedUi(), []);
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>(
    () => persistedUi?.rowStatusTab ?? 'current',
  );
  const [appliedListFilters, setAppliedListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    () => persistedUi?.appliedListFilters ?? EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [draftListFilters, setDraftListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    () => persistedUi?.appliedListFilters ?? EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [reevaluationModalOpen, setReevaluationModalOpen] = useState(false);
  const [reevaluationPartnerId, setReevaluationPartnerId] = useState<string | undefined>();
  const [reevaluationProjectId, setReevaluationProjectId] = useState<string | undefined>();
  const [reevaluationProjectLabel, setReevaluationProjectLabel] = useState<string | undefined>();

  const { page, pageSize, handleTableChange, getPaginationConfig, resetPage } = useServerTablePagination({
    defaultPageSize: 20,
  });

  useEffect(() => {
    const debounceTimeoutId = window.setTimeout(
      () => setDebouncedSearch(searchInput.trim()),
      SUPPLIER_EVALUATIONS_REGISTRY_SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(debounceTimeoutId);
  }, [searchInput]);

  const { data: projects = [] } = useProjectsPreview();
  const projectNameById = useMemo(
    () =>
      Object.fromEntries(
        projects.map(project => [project.id, project.name || project.code || project.id]),
      ),
    [projects],
  );

  const { data: partners = [] } = useQuery({
    queryKey: partnerQueryKeys.referenceList({ excludeArchived: true }),
    queryFn: () => partnerApi.getPartnersForReference({ excludeArchived: true }),
    staleTime: 5 * 60 * 1000,
  });
  const partnerNameById = useMemo(
    () =>
      Object.fromEntries(
        partners.map(partner => [partner.id, partner.short_name || partner.name || partner.id]),
      ),
    [partners],
  );

  const { data: registryCreators = [], isPending: isRegistryCreatorsPending } =
    useSupplierEvaluationRegistryCreators();
  const projectOptions = useMemo(
    () =>
      projects.map(project => ({
        value: project.id,
        label: String(project.name || project.code || project.id).trim() || project.id,
      })),
    [projects],
  );
  const buyerOptions = useMemo(
    () =>
      registryCreators
        .map(creator => ({ value: creator.id, label: creator.name }))
        .sort((left, right) => left.label.localeCompare(right.label, 'ru')),
    [registryCreators],
  );

  const tabCountRequestParams = useMemo(
    () => ({
      evaluated_year: evaluationYearsToApiParam(appliedListFilters.evaluatedYears),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by:
        appliedListFilters.createdByUserIds.length > 0
          ? appliedListFilters.createdByUserIds.join(',')
          : undefined,
      project_id:
        appliedListFilters.projectIds.length > 0 ? appliedListFilters.projectIds.join(',') : undefined,
      search: debouncedSearch || undefined,
    }),
    [appliedListFilters, debouncedSearch],
  );

  const { data: tabCounts, isLoading: tabCountsLoading } =
    useSupplierEvaluationTabCounts(tabCountRequestParams);

  const listParams = useMemo(() => {
    const base = {
      status: 'all' as const,
      evaluated_year: evaluationYearsToApiParam(appliedListFilters.evaluatedYears),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by:
        appliedListFilters.createdByUserIds.length > 0
          ? appliedListFilters.createdByUserIds.join(',')
          : undefined,
      project_id:
        appliedListFilters.projectIds.length > 0 ? appliedListFilters.projectIds.join(',') : undefined,
      ...evaluationRegistrySortToRequestParams(appliedListFilters.sortPreset),
    };
    return {
      ...base,
      ui_status: rowStatusTab === 'all' ? undefined : rowStatusTab,
      search: debouncedSearch || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    };
  }, [rowStatusTab, appliedListFilters, debouncedSearch, page, pageSize]);

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

  useEffect(() => {
    saveSupplierEvaluationsRegistryPersistedUi({ appliedListFilters, rowStatusTab });
  }, [appliedListFilters, rowStatusTab]);

  const displayRows = data?.data ?? [];
  const total = data?.total ?? 0;
  const displayTabCounts = tabCounts;

  const columns: ColumnsType<SupplierEvaluationListItem> = [
    Table.EXPAND_COLUMN,
    {
      title: 'Контрагент',
      key: 'partner',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, row) => {
        const label =
          row.partner_name?.trim() ||
          partnerNameById[row.partner_id] ||
          row.partner_id;
        return (
          <Link
            className={registryStyles.tableCellMultiline}
            to={`/partners/${row.partner_id}/evaluations`}
            state={SUPPLIER_EVALUATIONS_REGISTRY_PARTNER_LINK_STATE}
          >
            {label}
          </Link>
        );
      },
    },
    {
      title: 'Проект',
      key: 'project',
      onHeaderCell: () => ({ style: { textAlign: 'left' } }),
      onCell: () => ({ style: { verticalAlign: 'top' } }),
      render: (_, row) => (
        <Text strong className={registryStyles.tableCellMultiline}>
          {projectNameById[row.project_id] ?? row.project_id}
        </Text>
      ),
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
          {formatEvaluationScoreDisplay(Number(row.weighted_score))}
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
                      {tabCountsLoading ? '…' : (displayTabCounts?.[tab.key] ?? 0)}
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
        projectOptions={projectOptions}
        buyerOptions={buyerOptions}
        buyerOptionsLoading={isRegistryCreatorsPending}
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
                projectLabel={String(projectNameById[record.project_id] ?? '').trim() || record.project_id}
                onReevaluate={projectId => {
                  setReevaluationPartnerId(record.partner_id);
                  setReevaluationProjectId(projectId);
                  setReevaluationProjectLabel(
                    String(projectNameById[projectId] ?? '').trim() || undefined,
                  );
                  setReevaluationModalOpen(true);
                }}
              />
            ),
            rowExpandable: () => true,
          }}
        />
      </div>

      <NewSupplierEvaluationModal
        open={reevaluationModalOpen && Boolean(reevaluationPartnerId)}
        partnerId={reevaluationPartnerId ?? ''}
        initialProjectId={reevaluationProjectId}
        initialProjectLabel={reevaluationProjectLabel}
        onClose={() => {
          setReevaluationModalOpen(false);
          setReevaluationPartnerId(undefined);
          setReevaluationProjectId(undefined);
          setReevaluationProjectLabel(undefined);
        }}
        onSuccess={() => {
          void invalidateSupplierEvaluationQueries(queryClient);
          void refetch();
          setReevaluationModalOpen(false);
          setReevaluationPartnerId(undefined);
          setReevaluationProjectId(undefined);
          setReevaluationProjectLabel(undefined);
        }}
      />
    </div>
  );
}
