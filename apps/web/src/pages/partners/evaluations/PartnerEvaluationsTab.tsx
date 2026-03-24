import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Select, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import type { ColumnsType } from 'antd/es/table';

import { useProjectsPreview } from '../../../api/projects/projectApiHooks';
import {
  useSupplierEvaluationTabCounts,
  useSupplierEvaluationsList,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useUsers } from '../../../api/users/userApiHooks';
import { PageHeader } from '../../../components/pageLayout/PageHeader';
import { formatSrmUserName } from '../../../helpers/formatSrmUserName';
import { useServerTablePagination } from '../../../hooks/useServerTablePagination';
import type { Partner } from '../../../types/partner';
import type {
  SupplierEvaluationCategory,
  SupplierEvaluationListItem,
  SupplierEvaluationUiStatusParam,
} from '../../../types/supplierEvaluation';
import {
  EVALUATION_CATEGORY_FILTER_OPTIONS,
  EVALUATION_UI_TABS,
  EVALUATION_YEAR_FILTER_ALL,
  EVALUATION_YEAR_OPTIONS,
  evaluationYearFilterToApi,
} from '../../supplierEvaluations/supplierEvaluationsConstants';
import listStyles from '../../supplierEvaluations/EvaluationsListShared.module.scss';
import EvaluationExpandedContent from './EvaluationExpandedContent';
import NewSupplierEvaluationModal from './NewSupplierEvaluationModal';
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
  const partner = useOutletContext<Partner>();
  const [rowStatusTab, setRowStatusTab] = useState<SupplierEvaluationUiStatusParam>('current');
  const [evaluatedYearFilter, setEvaluatedYearFilter] = useState<string>(EVALUATION_YEAR_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState<'all' | SupplierEvaluationCategory>('all');
  const [createdByUserId, setCreatedByUserId] = useState<string | undefined>(undefined);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [reevaluationProjectId, setReevaluationProjectId] = useState<string | undefined>();

  const { page, pageSize, handleTableChange, getPaginationConfig, resetPage } = useServerTablePagination({
    defaultPageSize: 20,
  });

  const { data: projects = [] } = useProjectsPreview();
  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p.name || p.code || p.id])),
    [projects],
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
      partner_id: partner.id,
      evaluated_year: evaluationYearFilterToApi(evaluatedYearFilter),
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
    }),
    [partner.id, evaluatedYearFilter, categoryFilter, createdByUserId],
  );

  const { data: tabCounts, isLoading: tabCountsLoading } = useSupplierEvaluationTabCounts(
    tabCountRequestParams,
    Boolean(partner.id),
  );

  const listParams = useMemo(
    () => ({
      partner_id: partner.id,
      status: 'all' as const,
      ui_status: rowStatusTab === 'all' ? undefined : rowStatusTab,
      evaluated_year: evaluationYearFilterToApi(evaluatedYearFilter),
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      created_by: createdByUserId,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    }),
    [partner.id, rowStatusTab, evaluatedYearFilter, categoryFilter, createdByUserId, page, pageSize],
  );

  const { data, isLoading, refetch } = useSupplierEvaluationsList(listParams, Boolean(partner.id));

  useEffect(() => {
    resetPage();
  }, [partner.id, rowStatusTab, evaluatedYearFilter, categoryFilter, createdByUserId, resetPage]);

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
      title: 'Кат.',
      key: 'cat',
      width: 56,
      align: 'center',
      render: (_, row) => <CategoryTag category={row.category} />,
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
        const { text, color } = statusBadgeLabel(rowPresentationState);
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <div className={listStyles.wrap}>
      <PageHeader
        title='Оценки по проектам'
        subtitle='Актуальные и архивные оценки контрагента по проектам'
        actions={
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
                    {tab.label}
                    <span style={{ opacity: 0.72, fontWeight: 500 }}>
                      {' · '}
                      {tabCountsLoading ? '…' : (tabCounts?.[tab.key] ?? 0)}
                    </span>
                  </button>
                ))}
              </div>
              <div className={listStyles.filterTabsRight}>
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
          pagination={getPaginationConfig(data?.total ?? 0)}
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
            rowExpandable: () => true,
          }}
        />
      </div>

      <NewSupplierEvaluationModal
        open={evaluationModalOpen}
        onClose={() => setEvaluationModalOpen(false)}
        partnerId={partner.id}
        initialProjectId={reevaluationProjectId}
        onSuccess={() => {
          refetch();
          void queryClient.invalidateQueries({
            predicate: query => Array.isArray(query.queryKey) && query.queryKey[0] === 'partners',
          });
        }}
      />
    </div>
  );
}
