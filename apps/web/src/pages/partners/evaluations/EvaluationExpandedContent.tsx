import type { ThHTMLAttributes } from 'react';
import { CalendarOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { Alert, Button, Modal, Table, Tooltip, Typography, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import {
  useDeactivateSupplierEvaluationBlock,
  useArchiveSupplierEvaluation,
  useSupplierEvaluationBlock,
  useSupplierEvaluationDetail,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { SupplierEvaluationListItem, SupplierEvaluationScoreDetail } from '../../../types/supplierEvaluation';
import {
  ScoreDots,
  calendarDaysUntil,
  formatCriterionScoreLabel,
  getRowUiStatus,
  formatEvaluationScoreDisplay,
  lineWeightedScore,
  scoreColor,
  SUPPLIER_EVAL_WEIGHTED_MAX_D_EXCLUSIVE,
  weightPercent,
} from './supplierEvaluationUi';
import { EvaluationLowScoreFilesHint } from './EvaluationLowScoreFilesHint';
import { formatSupplierEvaluationCommentForDisplay } from './supplierEvaluationCommentDisplay';
import styles from './EvaluationExpandedContent.module.scss';

const { Text } = Typography;

type Props = {
  row: SupplierEvaluationListItem;
  partnerId: string;
  projectLabel?: string;
  onReevaluate?: (projectId: string) => void;
  /** false — только матрица, комментарий и подсказки (первичная оценка). */
  showProjectActions?: boolean;
};

export default function EvaluationExpandedContent({
  row,
  partnerId,
  projectLabel,
  onReevaluate,
  showProjectActions = true,
}: Props) {
  const { data: detail, isLoading } = useSupplierEvaluationDetail(row.id, true);
  const { data: block } = useSupplierEvaluationBlock(
    partnerId,
    row.project_id,
    showProjectActions && row.status === 'active' && Boolean(row.project_id),
  );
  const projectBlockActive = Boolean(block?.is_active);
  const deactivateMut = useDeactivateSupplierEvaluationBlock();
  const archiveMut = useArchiveSupplierEvaluation();
  const rowPresentationState = getRowUiStatus(row);
  const canArchiveEvaluation =
    showProjectActions && row.status === 'active' && Boolean(row.project_id) && row.project_id !== 'null';

  const handleDeactivateBlock = () => {
    if (!block?.id) return;
    Modal.confirm({
      title: 'Снять блокировку?',
      content: 'Контрагент снова сможет участвовать в закупках по этому проекту.',
      okText: 'Снять',
      cancelText: 'Отмена',
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          deactivateMut.mutate(block.id, {
            onSuccess: () => {
              notification.success({ message: 'Блокировка снята' });
              resolve();
            },
            onError: () => {
              notification.error({ message: 'Не удалось снять блокировку' });
              reject();
            },
          });
        }),
    });
  };

  const handleArchiveEvaluation = () => {
    const projectTitle = String(projectLabel ?? row.project_id ?? '').trim() || row.project_id;
    Modal.confirm({
      title: `Прекратить оценку по проекту ${projectTitle}?`,
      content:
        'Переоценка по этому проекту больше не будет требоваться. Для возобновления оценки создайте новую.',
      okText: 'Архивировать',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () =>
        new Promise<void>((resolve, reject) => {
          archiveMut.mutate(row.id, {
            onSuccess: () => {
              notification.success({ message: 'Оценка архивирована' });
              resolve();
            },
            onError: () => {
              notification.error({ message: 'Не удалось архивировать оценку' });
              reject();
            },
          });
        }),
    });
  };

  const sortedScores = detail?.scores
    ? [...detail.scores].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const recommendCorrectiveFiles =
    detail != null && Number(detail.weighted_score) < SUPPLIER_EVAL_WEIGHTED_MAX_D_EXCLUSIVE;

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
          <span className={styles.scoreDotsCell}>
            <ScoreDots value={scoreDetail.score} dotsRowClassName={styles.scoreDotsStrip} />
          </span>
          <span className={styles.scoreValueCell}>
            <Text strong>{formatCriterionScoreLabel(scoreDetail.score)}</Text>
          </span>
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
          {formatEvaluationScoreDisplay(lineWeightedScore(scoreDetail))}
        </Text>
      ),
    },
  ];

  const actionBarClass =
    rowPresentationState === 'soon'
      ? `${styles.actionBar} ${styles.actionBarSoon}`
      : `${styles.actionBar} ${styles.actionBarNeutral}`;

  const displayComment = formatSupplierEvaluationCommentForDisplay(detail?.comment);

  return (
    <div className={styles.root}>
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
                      style={{ color: scoreColor(Number(detail.weighted_score)) }}
                    >
                      {formatEvaluationScoreDisplay(Number(detail.weighted_score))}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
          {displayComment ? (
            <Alert
              type='warning'
              showIcon
              message='Комментарий'
              description={displayComment}
              className={styles.mt12}
            />
          ) : null}

          {recommendCorrectiveFiles ? (
            <EvaluationLowScoreFilesHint partnerId={partnerId} className={styles.mt12} />
          ) : null}

          {showProjectActions && row.status === 'active' && block?.is_active && (
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

          {showProjectActions && row.status === 'active' && (
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
                    onClick={() => onReevaluate?.(row.project_id)}
                  >
                    Провести переоценку
                  </Button>
                </span>
              </Tooltip>
              {canArchiveEvaluation ? (
                <span className={styles.inlineBlock}>
                  <Button
                    danger
                    disabled={archiveMut.isPending}
                    loading={archiveMut.isPending}
                    onClick={handleArchiveEvaluation}
                  >
                    Архивировать
                  </Button>
                </span>
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}
