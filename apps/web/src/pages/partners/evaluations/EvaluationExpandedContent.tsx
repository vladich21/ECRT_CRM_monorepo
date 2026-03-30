import type { ThHTMLAttributes } from 'react';
import { CalendarOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Table, Tooltip, Typography } from 'antd';
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
import styles from './EvaluationExpandedContent.module.scss';

const { Text } = Typography;

type Props = {
  row: SupplierEvaluationListItem;
  partnerId: string;
  onReevaluate: (projectId: string) => void;
};

export default function EvaluationExpandedContent({ row, partnerId, onReevaluate }: Props) {
  const { data: detail, isLoading } = useSupplierEvaluationDetail(row.id, true);
  const { data: block } = useSupplierEvaluationBlock(partnerId, row.project_id, row.status === 'active');
  const projectBlockActive = Boolean(block?.is_active);
  const deactivateMut = useDeactivateSupplierEvaluationBlock();
  const { showNotification, contextHolder } = useNotification();
  const rowPresentationState = getRowUiStatus(row);

  const handleDeactivateBlock = () => {
    if (!block?.id) return;
    Modal.confirm({
      title: 'Снять блокировку?',
      content: 'Контрагент снова сможет участвовать в закупках по этому проекту.',
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
      render: (_value, scoreDetail) => (
        <Text type='secondary'>{weightPercent(scoreDetail.criterion_weight ?? 0)}</Text>
      ),
    },
    {
      title: 'Балл',
      key: 'score',
      width: 200,
      align: 'right',
      render: (_value, scoreDetail) => (
        <span className={styles.scoreRow}>
          <ScoreDots value={scoreDetail.score} />
          <Text strong>{scoreDetail.score}</Text>
        </span>
      ),
    },
    {
      title: '× Вес',
      key: 'weightedLine',
      width: 100,
      align: 'right',
      render: (_value, scoreDetail) => (
        <Text strong className={styles.weightedValue}>
          {lineWeightedScore(scoreDetail).toFixed(3)}
        </Text>
      ),
    },
  ];

  const actionBarClass =
    rowPresentationState === 'soon'
      ? `${styles.actionBar} ${styles.actionBarSoon}`
      : `${styles.actionBar} ${styles.actionBarNeutral}`;

  return (
    <div className={styles.root}>
      {contextHolder}
      {isLoading || !detail ? (
        <Text type='secondary'>Загрузка деталей…</Text>
      ) : (
        <>
          {detail.created_by_name ? (
            <Text type='secondary' className={styles.caption}>
              Закупщик:{' '}
              <Text strong className={styles.captionName}>
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
                    className={[styles.tableHeadCell, p.className].filter(Boolean).join(' ')}
                  />
                ),
              },
            }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row className={styles.summaryRow}>
                  <Table.Summary.Cell index={0} colSpan={3}>
                    <Text strong>Итого</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3} align='right'>
                    <Text
                      strong
                      className={styles.totalScore}
                      style={{ color: scoreColor(detail.weighted_score) }}
                    >
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
              className={styles.mt12}
            />
          ) : null}

          {row.status === 'active' && block?.is_active && (
            <Alert
              type='error'
              showIcon
              className={styles.mt12}
              message='Контрагент заблокирован по этому проекту'
              action={
                <Button size='small' danger icon={<StopOutlined />} onClick={handleDeactivateBlock}>
                  Снять блокировку
                </Button>
              }
            />
          )}

          {row.status === 'active' && (
            <div className={actionBarClass}>
              <div className={styles.actionCol}>
                {rowPresentationState === 'blocked' && (
                  <Text type='danger' className={styles.textBlock}>
                    Требуется новая оценка после снятия блокировки
                  </Text>
                )}
                {rowPresentationState === 'overdue' && row.next_reevaluation_date && (
                  <div className={styles.flexGap}>
                    <CalendarOutlined className={styles.iconOverdue} />
                    <Text type='danger' strong className={styles.planNote}>
                      Переоценка просрочена · {dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}{' '}
                      <span className={styles.daysCount}>
                        ({Math.abs(calendarDaysUntil(row.next_reevaluation_date))} дн.)
                      </span>
                    </Text>
                  </div>
                )}
                {rowPresentationState === 'soon' && row.next_reevaluation_date && (
                  <div className={styles.flexGap}>
                    <CalendarOutlined className={styles.iconSoon} />
                    <Text strong className={styles.textSoon}>
                      Переоценка через {calendarDaysUntil(row.next_reevaluation_date)} дн. ·{' '}
                      {dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}
                    </Text>
                  </div>
                )}
                {rowPresentationState === 'active' && row.next_reevaluation_date && (
                  <div className={styles.planNote}>
                    <Text type='secondary'>Следующая переоценка по плану: </Text>
                    <Text type='secondary'>{dayjs(row.next_reevaluation_date).format('DD.MM.YYYY')}</Text>
                  </div>
                )}
                {rowPresentationState === 'active' && !row.next_reevaluation_date && (
                  <Text type='secondary' className={styles.planNote}>
                    Плановая дата переоценки не задана
                  </Text>
                )}
              </div>
              <Tooltip
                title={
                  projectBlockActive
                    ? 'Сначала снимите блокировку по этому проекту — затем можно провести переоценку'
                    : undefined
                }
              >
                <span className={styles.inlineBlock}>
                  <Button
                    type='primary'
                    ghost
                    icon={<ReloadOutlined />}
                    disabled={projectBlockActive}
                    onClick={() => onReevaluate(row.project_id)}
                  >
                    Провести переоценку
                  </Button>
                </span>
              </Tooltip>
            </div>
          )}
        </>
      )}
    </div>
  );
}
