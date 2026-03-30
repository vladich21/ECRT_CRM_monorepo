import { useEffect, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Modal, Table, Tag, Typography } from 'antd';
import { DeleteOutlined, FilterOutlined, PlusOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

import { useProjectsPreview } from '../../../api/projects/projectApiHooks';
import {
  useDeleteSupplierEvaluation,
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useUsers } from '../../../api/users/userApiHooks';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { formatSrmUserName } from '../../../helpers/formatSrmUserName';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import { mutedTagStyle } from '../../../constants/statusBadgeSurfaces';
import type { Partner } from '../../../types/partner';
import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
  SupplierEvaluationUiStatusParam,
} from '../../../types/supplierEvaluation';
import {
  EVALUATION_UI_TABS,
  supplierEvaluationEvaluatedAtRangePresets,
} from '../../supplierEvaluations/supplierEvaluationsConstants';
import listStyles from '../../supplierEvaluations/EvaluationsListShared.module.scss';
import EvaluationExpandedContent from './EvaluationExpandedContent';
import {
  PartnerEvaluationsFiltersModal,
  EMPTY_PARTNER_EVALUATIONS_LIST_FILTERS,
  countActivePartnerEvaluationsFilters,
  type PartnerEvaluationsListFilters,
} from './PartnerEvaluationsFiltersModal';
import NewSupplierEvaluationModal from './NewSupplierEvaluationModal';
import {
  PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS,
  augmentPartnerEvaluationsListWithMock,
  augmentPartnerEvaluationsTabCountsWithMock,
  isPartnerEvaluationsUiMockPartnerId,
  isPartnerEvaluationsUiMockRowId,
} from './partnerEvaluationsUiMock';
import {
  CategoryTag,
  formatReevaluationCell,
  getRowUiStatus,
  scoreColor,
  statusBadgeLabel,
} from './supplierEvaluationUi';

const { Text } = Typography;

export default function PartnerEvaluationsTab() {
  const queryClient = useQueryClient();
  const { showNotification, contextHolder } = useNotification();
  const deleteMut = useDeleteSupplierEvaluation();
  const partner = useOutletContext<Partner>();
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>('current');
  const [evaluatedAtRange, setEvaluatedAtRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | SupplierEvaluationCategory>('all');
  const [createdByUserId, setCreatedByUserId] = useState<string | undefined>(undefined);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [reevaluationProjectId, setReevaluationProjectId] = useState<string | undefined>();
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [filtersDraft, setFiltersDraft] = useState<PartnerEvaluationsListFilters>(
    EMPTY_PARTNER_EVALUATIONS_LIST_FILTERS,
  );

  const { page, pageSize, handleTableChange, getPaginationConfig, resetPage } = useServerTablePagination({
    defaultPageSize: 20,
  });

  const { data: projects = [] } = useProjectsPreview();
  const projectNameById = useMemo(() => {
    const base = Object.fromEntries(
      projects.map(project => [project.id, project.name || project.code || project.id]),
    );
    return isPartnerEvaluationsUiMockPartnerId(partner.id)
      ? { ...base, ...PARTNER_EVALUATIONS_UI_MOCK_PROJECT_LABELS }
      : base;
  }, [projects, partner.id]);

  const { data: usersResponse } = useUsers(2, true);
  const buyerOptions = useMemo(
    () =>
      (usersResponse?.data ?? []).map(user => ({
        value: user.id,
        label: formatSrmUserName(user),
      })),
    [usersResponse?.data],
  );

  const evaluatedAtFromIso = evaluatedAtRange?.[0]?.format('YYYY-MM-DD');
  const evaluatedAtToIso = evaluatedAtRange?.[1]?.format('YYYY-MM-DD');

  const evaluatedAtRangePresets = useMemo(() => supplierEvaluationEvaluatedAtRangePresets(), []);

  const tabCountRequestParams = useMemo(
    () => ({
      partner_id: partner.id,
      evaluated_at_from: evaluatedAtFromIso,
      evaluated_at_to: evaluatedAtToIso,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
    }),
    [partner.id, evaluatedAtFromIso, evaluatedAtToIso, categoryFilter, createdByUserId],
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
      evaluated_at_from: evaluatedAtFromIso,
      evaluated_at_to: evaluatedAtToIso,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [
      partner.id,
      rowStatusTab,
      evaluatedAtFromIso,
      evaluatedAtToIso,
      categoryFilter,
      createdByUserId,
      page,
      pageSize,
    ],
  );

  const { data: listDataRaw, isLoading, refetch } = useSupplierEvaluationsList(listParams, Boolean(partner.id));

  const showEvaluationsUiMock =
    isPartnerEvaluationsUiMockPartnerId(partner.id) &&
    categoryFilter === 'all' &&
    !createdByUserId &&
    evaluatedAtRange == null;

  const data = useMemo(
    () =>
      showEvaluationsUiMock
        ? augmentPartnerEvaluationsListWithMock(listDataRaw, partner.id, rowStatusTab, page, pageSize)
        : listDataRaw,
    [listDataRaw, showEvaluationsUiMock, partner.id, rowStatusTab, page, pageSize],
  );

  const tabCounts = useMemo(
    () =>
      showEvaluationsUiMock
        ? augmentPartnerEvaluationsTabCountsWithMock(tabCountsRaw, partner.id)
        : tabCountsRaw,
    [tabCountsRaw, showEvaluationsUiMock, partner.id],
  );

  const activeFiltersCount = useMemo(
    () =>
      countActivePartnerEvaluationsFilters({
        evaluatedAtRange,
        category: categoryFilter,
        createdByUserId,
      }),
    [evaluatedAtRange, categoryFilter, createdByUserId],
  );

  useEffect(() => {
    resetPage();
  }, [partner.id, rowStatusTab, evaluatedAtFromIso, evaluatedAtToIso, categoryFilter, createdByUserId, resetPage]);

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
          {Number(row.weighted_score).toFixed(2)}
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
          disabled={!!partner.is_deleted || isPartnerEvaluationsUiMockRowId(row.id)}
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
                        queryKey: ['supplier-evaluations', 'partner-kpi', partner.id],
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
      <PageHeader
        title='Оценки по проектам'
        actions={
          <>
            <Button
              icon={<FilterOutlined />}
              className={activeFiltersCount > 0 ? listStyles.filtersBtnActive : undefined}
              onClick={() => {
                setFiltersDraft({
                  evaluatedAtRange,
                  category: categoryFilter,
                  createdByUserId,
                });
                setFiltersModalOpen(true);
              }}
            >
              Фильтр
              {activeFiltersCount > 0 && (
                <span className={listStyles.filtersBadge}>{activeFiltersCount}</span>
              )}
            </Button>
            <Button
              type='primary'
              icon={<PlusOutlined />}
              disabled={!!partner.is_deleted}
              onClick={() => {
                setReevaluationProjectId(undefined);
                setEvaluationModalOpen(true);
              }}
            >
              Новая оценка
            </Button>
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

      {showEvaluationsUiMock ? (
        <Alert
          type='info'
          showIcon
          closable
          style={{ marginTop: 16 }}
          message='Демо-строки для всех вкладок'
          description={
            'Просрочка (−21/−7/−1 дн.), скоро (0,1,5,11,19,20 — граница окна 20 дн.), актуальные (21, 90 дн. и строка без даты), 2 блокировки (D без даты), 2 архива. Счётчики вкладок и KPI усилены моками; строки без раскрытия и удаления.'
          }
        />
      ) : null}

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
                  setEvaluationModalOpen(true);
                }}
              />
            ),
            rowExpandable: record => !isPartnerEvaluationsUiMockRowId(record.id),
          }}
        />
      </div>

      <PartnerEvaluationsFiltersModal
        open={filtersModalOpen}
        draft={filtersDraft}
        onUpdateDraft={patch => setFiltersDraft(prev => ({ ...prev, ...patch }))}
        onClose={() => setFiltersModalOpen(false)}
        onApply={() => {
          setEvaluatedAtRange(filtersDraft.evaluatedAtRange);
          setCategoryFilter(filtersDraft.category);
          setCreatedByUserId(filtersDraft.createdByUserId);
          setFiltersModalOpen(false);
        }}
        onResetDraft={() => setFiltersDraft(EMPTY_PARTNER_EVALUATIONS_LIST_FILTERS)}
        buyerOptions={buyerOptions}
        rangePresets={evaluatedAtRangePresets}
      />

      <NewSupplierEvaluationModal
        open={evaluationModalOpen}
        onClose={() => setEvaluationModalOpen(false)}
        partnerId={partner.id}
        initialProjectId={reevaluationProjectId}
        onSuccess={() => {
          refetch();
          void queryClient.invalidateQueries({ queryKey: ['supplier-evaluations', 'partner-kpi', partner.id] });
          void queryClient.invalidateQueries({
            predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'partners',
          });
        }}
      />
    </div>
  );
}
