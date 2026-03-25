import type { ThHTMLAttributes } from 'react';
import { CalendarOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  useDeactivateSupplierEvaluationBlock,
  useSupplierEvaluationBlock,
  useSupplierEvaluationDetail,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { useNotification } from '../../../customhooks/useNotification';
import type { SupplierEvaluationListItem, SupplierEvaluationScoreDetail } from '../../../types/supplierEvaluation';
import {
  ScoreDots,
  calendarDaysUntil,
  getRowUiStatus,
  lineWeightedScore,
  scoreColor,
  weightPercent,
} from './supplierEvaluationUi';

const { Text } = Typography;

type Props = {
  row: SupplierEvaluationListItem;
  partnerId: string;
  onReevaluate: (projectId: string) => void;
};

export default function EvaluationExpandedContent({ row, partnerId, onReevaluate }: Props) {
  const { data: detail, isLoading } = useSupplierEvaluationDetail(row.id, true);
  const { data: block } = useSupplierEvaluationBlock(partnerId, row.project_id, row.status === 'active');
  const deactivateMut = useDeactivateSupplierEvaluationBlock();
  const { showNotification, contextHolder } = useNotification();
  const rowPresentationState = getRowUiStatus(row);

  const handleDeactivateBlock = () => {
    if (!block?.id) return;
    Modal.confirm({
      title: 'Снять блокировку?',
      content: 'Контрагент снова сможет участвовать в закупках по этому проекту (по бизнес-процессу).',
      okText: 'Снять',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deactivateMut.mutateAsync(block.id);
          showNotification('success', 'Блокировка снята');
        } catch {
          showNotification('error', 'Не удалось снять блокировку');
        }
      },
    });
  };

  const sortedScores = detail?.scores
    ? [...detail.scores].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const scoreColumns: ColumnsType<SupplierEvaluationScoreDetail> = [
    {
      title: 'Критерий',
      dataIndex: 'criterion_name',
      key: 'name',
    },
    {
      title: 'Вес',
      key: 'criterionWeight',
      width: 90,
      align: 'right',
      render: (_, r) => <Text type='secondary'>{weightPercent(r.criterion_weight ?? 0)}</Text>,
    },
    {
      title: 'Балл',
      key: 'score',
      width: 200,
      align: 'right',
      render: (_, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <ScoreDots value={r.score} />
          <Text strong>{r.score}</Text>
        </span>
      ),
    },
    {
      title: '× Вес',
      key: 'weightedLine',
      width: 100,
      align: 'right',
      render: (_, r) => (
        <Text strong style={{ color: '#1677ff' }}>
          {lineWeightedScore(r).toFixed(3)}
        </Text>
      ),
    },
  ];

  return (
    <div style={{ background: '#fafafa', padding: '12px 16px 16px 48px' }}>
      {contextHolder}
      {isLoading || !detail ? (
        <Text type='secondary'>Загрузка деталей…</Text>
      ) : (
        <>
          {detail.created_by_name ? (
            <Text type='secondary' style={{ display: 'block', marginBottom: 8, fontSize: 13 }}>
              Закупщик:{' '}
              <Text strong style={{ color: '#262626' }}>
                {detail.created_by_name}
              </Text>
            </Text>
          ) : null}
          <Table<SupplierEvaluationScoreDetail>
            size='small'
            pagination={false}
            rowKey='criterion_id'
            dataSource={sortedScores}
            columns={scoreColumns}
            showHeader
            components={{
              header: {
                cell: (p: ThHTMLAttributes<HTMLTableCellElement>) => (
                  <th
                    {...p}
                    style={{
                      ...p.style,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#8c8c8c',
                      background: '#f5f5f5',
                    }}
                  />
                ),
              },
            }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row style={{ background: '#fff' }}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Итого</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align='right'>
                    <Text strong style={{ fontSize: 15, color: scoreColor(detail.weighted_score) }}>
                      {Number(detail.weighted_score).toFixed(2)}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
          {detail.comment ? (
            <Alert
              type='warning'
              showIcon
              message='Комментарий'
              description={detail.comment}
              style={{ marginTop: 12 }}
            />
          ) : null}

          {row.status === 'active' && block?.is_active && (
            <Alert
              type='error'
              showIcon
              style={{ marginTop: 12 }}
              message='Контрагент заблокирован по этому проекту'
              action={
                <Button size='small' danger icon={<StopOutlined />} onClick={handleDeactivateBlock}>
                  Снять блокировку
                </Button>
              }
            />
          )}

          {row.status === 'active' && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                background: rowPresentationState === 'soon' ? '#fffbe6' : '#fafafa',
                border: `1px solid ${rowPresentationState === 'soon' ? '#ffe58f' : '#f0f0f0'}`,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                {rowPresentationState === 'blocked' && (
                  <Text type='danger' style={{ display: 'block' }}>
                    Требуется новая оценка после снятия блокировки
                  </Text>
                )}
                {rowPresentationState === 'overdue' && row.next_reevaluation_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <CalendarOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                    <Text type='danger' strong style={{ fontSize: 13 }}>
                      Переоценка просрочена · {dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}
                      {' '}
                      <span style={{ fontWeight: 700 }}>
                        ({Math.abs(calendarDaysUntil(row.next_reevaluation_date))} дн.)
                      </span>
                    </Text>
                  </div>
                )}
                {rowPresentationState === 'soon' && row.next_reevaluation_date && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <CalendarOutlined style={{ color: '#d48806', fontSize: 16 }} />
                    <Text strong style={{ fontSize: 13, color: '#d48806' }}>
                      Переоценка через {calendarDaysUntil(row.next_reevaluation_date)} дн. ·{' '}
                      {dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}
                    </Text>
                  </div>
                )}
                {rowPresentationState === 'active' && row.next_reevaluation_date && (
                  <div style={{ fontSize: 13 }}>
                    <Text type='secondary'>Следующая переоценка по плану: </Text>
                    <Text type='secondary'>{dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}</Text>
                  </div>
                )}
                {rowPresentationState === 'active' && !row.next_reevaluation_date && (
                  <Text type='secondary' style={{ fontSize: 13 }}>
                    Плановая дата переоценки не задана
                  </Text>
                )}
              </div>
              <Button type='primary' ghost icon={<ReloadOutlined />} onClick={() => onReevaluate(row.project_id)}>
                Провести переоценку
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
