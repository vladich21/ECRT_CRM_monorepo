import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Modal, Table, Tag, Tooltip, Typography } from 'antd';
import { DeleteOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { useProjectsPreview } from '../../../api/projects/projectApiHooks';
import { invalidatePartnerQueries } from '../../../api/partners/partnerQueryKeys';
import {
  usePartnerSupplierEvalKpi,
  useDeleteSupplierEvaluation,
  useSupplierEvaluationRegistryCreators,
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import {
  invalidateSupplierEvaluationQueries,
  supplierEvaluationQueryKeys,
} from '../../../api/supplierEvaluations/supplierEvaluationQueryKeys';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import type { Partner } from '../../../types/partner';
import type { SupplierEvaluationListItem, SupplierEvaluationUiStatusParam } from '../../../types/supplierEvaluation';
import {
  EVALUATION_UI_TABS,
  evaluationRegistrySortToRequestParams,
  evaluationYearsToApiParam,
} from '../../supplierEvaluations/supplierEvaluationsConstants';
import listStyles from '../../supplierEvaluations/EvaluationsListShared.module.scss';
import {
  EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  SupplierEvaluationsRegistryFiltersModal,
  countActiveRegistryFilters,
  type EvaluationsRegistryAppliedFilters,
} from '../../supplierEvaluations/SupplierEvaluationsRegistryFiltersModal';
import EvaluationExpandedContent from './EvaluationExpandedContent';
import NewSupplierEvaluationModal from './NewSupplierEvaluationModal';
import NewInitialSupplierEvaluationModal from './NewInitialSupplierEvaluationModal';
import { ARCHIVED_PARTNER_EVALUATIONS_TOOLTIP } from './supplierEvaluationPartnerArchiveUi';
import {
  CategoryTag,
  formatEvaluationScoreDisplay,
  formatReevaluationCell,
  getRowUiStatus,
  scoreColor,
  statusBadgeLabel,
} from './supplierEvaluationUi';

const { Text } = Typography;

export default function PartnerEvaluationsTab() {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const deleteMut = useDeleteSupplierEvaluation();
  const partner = useOutletContext<Partner>();
  const { data: references } = useReferenceData(['partnerStatuses']);
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>('current');
  const [appliedListFilters, setAppliedListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [draftListFilters, setDraftListFilters] = useState<EvaluationsRegistryAppliedFilters>(
    EMPTY_EVALUATIONS_REGISTRY_FILTERS,
  );
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [initialEvaluationModalOpen, setInitialEvaluationModalOpen] = useState(false);

  const isPartnerArchived = useMemo(() => {
    const name = references?.partnerStatuses?.find(s => String(s.id) === String(partner.status_id))?.name;
    return (name ?? '').trim() === 'Архив';
  }, [partner.status_id, references?.partnerStatuses]);

  const { data: activeEvaluationsPage } = useSupplierEvaluationsList(
    { partner_id: partner.id, status: 'active', limit: 1, offset: 0 },
    Boolean(partner.id),
  );
  const hasActiveEvaluations = (activeEvaluationsPage?.total ?? 0) > 0;
  const evaluationsCreationDisabled = Boolean(partner.is_deleted) || isPartnerArchived;

  useEffect(() => {
    const state = location.state as { openInitialSupplierEvaluation?: boolean } | null;
    if (state?.openInitialSupplierEvaluation === true) {
      setInitialEvaluationModalOpen(true);
      navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    }
  }, [location.pathname, location.search, location.state, navigate]);
  const [reevaluationProjectId, setReevaluationProjectId] = useState<string | undefined>();
  const [reevaluationProjectLabel, setReevaluationProjectLabel] = useState<string | undefined>();

  const { page, pageSize, handleTableChange, getPaginationConfig, resetPage } = useServerTablePagination({
    defaultPageSize: 20,
  });

  useEffect(() => {
    setAppliedListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
    setDraftListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
  }, [partner.id]);

  const { data: projects = [] } = useProjectsPreview();
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map(project => [project.id, project.name || project.code || project.id])),
    [projects],
  );
  const projectOptions = useMemo(
    () =>
      projects.map(project => ({
        value: project.id,
        label: String(project.name || project.code || project.id).trim() || project.id,
      })),
    [projects],
  );

  const { data: registryCreators = [], isPending: isRegistryCreatorsPending } =
    useSupplierEvaluationRegistryCreators(partner.id);
  const buyerOptions = useMemo(
    () =>
      registryCreators
        .map(creator => ({ value: creator.id, label: creator.name }))
        .sort((left, right) => left.label.localeCompare(right.label, 'ru')),
    [registryCreators],
  );

  const tabCountRequestParams = useMemo(
    () => ({
      partner_id: partner.id,
      evaluated_year: evaluationYearsToApiParam(appliedListFilters.evaluatedYears),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by:
        appliedListFilters.createdByUserIds.length > 0
          ? appliedListFilters.createdByUserIds.join(',')
          : undefined,
      project_id:
        appliedListFilters.projectIds.length > 0 ? appliedListFilters.projectIds.join(',') : undefined,
    }),
    [partner.id, appliedListFilters],
  );

  const { data: tabCountsRaw, isLoading: tabCountsLoading } = useSupplierEvaluationTabCounts(
    tabCountRequestParams,
    Boolean(partner.id),
  );

  const listParams = useMemo(
    () => ({
      partner_id: partner.id,
      status: 'all' as const,
      ui_status: rowStatusTab === 'all' ? undefined : rowStatusTab,
      evaluated_year: evaluationYearsToApiParam(appliedListFilters.evaluatedYears),
      category: appliedListFilters.category === 'all' ? undefined : appliedListFilters.category,
      created_by:
        appliedListFilters.createdByUserIds.length > 0
          ? appliedListFilters.createdByUserIds.join(',')
          : undefined,
      project_id:
        appliedListFilters.projectIds.length > 0 ? appliedListFilters.projectIds.join(',') : undefined,
      ...evaluationRegistrySortToRequestParams(appliedListFilters.sortPreset),
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [partner.id, rowStatusTab, appliedListFilters, page, pageSize],
  );

  const { data: listDataRaw, isLoading, refetch } = useSupplierEvaluationsList(listParams, Boolean(partner.id));
  const { data: partnerKpi } = usePartnerSupplierEvalKpi(partner.id, Boolean(partner.id));

  const data = listDataRaw;
  const tabCounts = tabCountsRaw;

  const activeFiltersCount = useMemo(() => countActiveRegistryFilters(appliedListFilters), [appliedListFilters]);

  useEffect(() => {
    resetPage();
  }, [partner.id, rowStatusTab, appliedListFilters, resetPage]);

  const columns: ColumnsType<SupplierEvaluationListItem> = [
    Table.EXPAND_COLUMN,
    {
      title: 'Проект',
      key: 'project',
      render: (_, row) => (
        <Text strong style={{ color: '#262626' }}>
          {projectNameById[row.project_id] ?? row.project_id}
        </Text>
      ),
    },
    {
      title: 'Дата оценки',
      dataIndex: 'evaluated_at',
      width: 120,
      render: (v: string) => <Text type='secondary'>{v ? v.split('-').reverse().join('.') : '—'}</Text>,
    },
    {
      title: 'Закупщик',
      key: 'buyer',
      width: 160,
      ellipsis: true,
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
      render: (_, row) => (
        <Text strong style={{ color: scoreColor(row.weighted_score) }}>
          {formatEvaluationScoreDisplay(Number(row.weighted_score))}
        </Text>
      ),
    },
    {
      title: 'Переоценка',
      key: 'reeval',
      width: 160,
      render: (_, row) => formatReevaluationCell(row, getRowUiStatus(row)),
    },
    {
      title: 'Статус',
      key: 'st',
      width: 150,
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
      render: (_, row) => (
        <Button
          type='text'
          danger
          size='small'
          icon={<DeleteOutlined />}
          aria-label='Удалить оценку'
          disabled={!!partner.is_deleted}
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
                      void queryClient.invalidateQueries({
                        queryKey: supplierEvaluationQueryKeys.partnerKpi(partner.id),
                      });
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
      {!isPartnerArchived && !hasActiveEvaluations ? (
        <Alert
          type='info'
          showIcon
          message='У контрагента нет активных оценок поставщика.'
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <PageHeader
        title='Оценки по проектам'
        actions={
          <>
            <Button
              icon={<FilterOutlined />}
              className={activeFiltersCount > 0 ? listStyles.filtersBtnActive : undefined}
              onClick={() => {
                setDraftListFilters(appliedListFilters);
                setFiltersModalOpen(true);
              }}
            >
              Фильтры
              {activeFiltersCount > 0 && (
                <span className={listStyles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            {evaluationsCreationDisabled && isPartnerArchived ? (
              <Tooltip title={ARCHIVED_PARTNER_EVALUATIONS_TOOLTIP}>
                <span>
                  <Button type='primary' icon={<PlusOutlined />} disabled>
                    Новая оценка
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button
                type='primary'
                icon={<PlusOutlined />}
                disabled={evaluationsCreationDisabled}
                onClick={() => {
                  setReevaluationProjectId(undefined);
                  setReevaluationProjectLabel(undefined);
                  setEvaluationModalOpen(true);
                }}
              >
                Новая оценка
              </Button>
            )}
            {partnerKpi?.avgScore == null ? (
              evaluationsCreationDisabled && isPartnerArchived ? (
                <Tooltip title={ARCHIVED_PARTNER_EVALUATIONS_TOOLTIP}>
                  <span>
                    <Button type='default' disabled>
                      Первичная оценка
                    </Button>
                  </span>
                </Tooltip>
              ) : (
                <Button
                  type='default'
                  disabled={evaluationsCreationDisabled}
                  onClick={() => setInitialEvaluationModalOpen(true)}
                >
                  Первичная оценка
                </Button>
              )
            ) : null}
          </>
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
            </div>
          </div>
        }
      />

      <div className={listStyles.tableCard} style={{ marginTop: 16 }}>
        <Table<SupplierEvaluationListItem>
          rowKey='id'
          loading={isLoading}
          columns={columns}
          dataSource={data?.data ?? []}
          tableLayout='fixed'
          scroll={{ x: 1000 }}
          pagination={{
            ...getPaginationConfig(data?.total ?? 0),
            className: listStyles.evaluationsTablePagination,
          }}
          onChange={pagination => handleTableChange(pagination)}
          expandable={{
            expandedRowRender: record => (
              <EvaluationExpandedContent
                row={record}
                partnerId={partner.id}
                onReevaluate={projectId => {
                  setReevaluationProjectId(projectId);
                  setReevaluationProjectLabel(
                    String(projectNameById[projectId] ?? '').trim() || undefined,
                  );
                  setEvaluationModalOpen(true);
                }}
              />
            ),
            rowExpandable: () => true,
          }}
        />
      </div>

      <SupplierEvaluationsRegistryFiltersModal
        open={filtersModalOpen}
        draft={draftListFilters}
        onUpdateDraft={patch => setDraftListFilters(prev => ({ ...prev, ...patch }))}
        onClose={() => setFiltersModalOpen(false)}
        onApply={() => {
          setAppliedListFilters(draftListFilters);
          setFiltersModalOpen(false);
          resetPage();
        }}
        onReset={() => {
          setDraftListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
          setAppliedListFilters(EMPTY_EVALUATIONS_REGISTRY_FILTERS);
          setFiltersModalOpen(false);
          resetPage();
        }}
        projectOptions={projectOptions}
        buyerOptions={buyerOptions}
        buyerOptionsLoading={isRegistryCreatorsPending}
      />

      <NewSupplierEvaluationModal
        open={evaluationModalOpen}
        onClose={() => {
          setEvaluationModalOpen(false);
          setReevaluationProjectId(undefined);
          setReevaluationProjectLabel(undefined);
        }}
        partnerId={partner.id}
        initialProjectId={reevaluationProjectId}
        initialProjectLabel={reevaluationProjectLabel}
        onSuccess={() => {
          refetch();
          setReevaluationProjectId(undefined);
          setReevaluationProjectLabel(undefined);
          void queryClient.invalidateQueries({
            queryKey: supplierEvaluationQueryKeys.partnerKpi(partner.id),
          });
          void invalidatePartnerQueries(queryClient);
        }}
      />

      <NewInitialSupplierEvaluationModal
        open={initialEvaluationModalOpen}
        onClose={() => setInitialEvaluationModalOpen(false)}
        partnerId={partner.id}
        onSuccess={() => {
          void invalidateSupplierEvaluationQueries(queryClient);
          void invalidatePartnerQueries(queryClient);
        }}
      />
    </div>
  );
}
