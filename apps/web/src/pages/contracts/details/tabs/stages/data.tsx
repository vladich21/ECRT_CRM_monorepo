import { CalendarOutlined, CheckCircleOutlined, DollarOutlined, NumberOutlined } from '@ant-design/icons';
import { Progress, Tag, Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';

import { ReferenceData } from '@/api/hooks/useReferences';
import { APP_COLOR_ERROR, APP_COLOR_PRIMARY } from '@/constants/appColors';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { getTagColorByData } from '@/helpers/getTagColorByData';
import { formatRub } from '@/helpers/numberFormatters';
import { ContractRevision, ContractStage } from '@/types/contract';
import styles from './data.module.scss';

const STAGE_STATE_TAG_CLASS: Record<string, string> = {
  planned: styles.tagNeutral,
  in_progress: styles.tagPotential,
  completed: styles.tagSuccess,
  on_hold: styles.tagWarning,
  cancelled: styles.tagDanger,
};

function budgetDeviationRowClass(deviationPercent: number): string {
  if (deviationPercent > 10) return styles.budgetDeviation;
  if (deviationPercent < -10) return styles.budgetDeviationPositive;
  return styles.budgetDeviationNeutral;
}

export const getStageColumnsData = (
  references: Pick<ReferenceData, 'contractStageStates' | 'contracts'>,
): ColumnType<ContractStage>[] => [
  {
    title: (
      <span>
        <NumberOutlined className={styles.iconMargin} />№
      </span>
    ),
    dataIndex: 'stage_number',
    key: 'stage_number',
    width: 60,
    sorter: (a, b) => a.stage_number - b.stage_number,
    defaultSortOrder: 'ascend',
    render: (number: number) => (
      <Tag color='blue' className={styles.stageNumberTag}>
        {number}
      </Tag>
    ),
  },
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    ellipsis: true,
  },
  {
    title: (
      <span>
        <CalendarOutlined className={styles.iconMargin} />
        Сроки
      </span>
    ),
    key: 'dates',
    width: 180,
    render: (_: any, record: ContractStage) => (
      <div className={styles.datesContainer}>
        <div>
          <strong>План:</strong> {formatDate(record.planned_start_date)} - {formatDate(record.planned_end_date)}
        </div>
        <div>
          <strong>Факт:</strong> {formatDate(record.actual_start_date) || '-'} -{' '}
          {formatDate(record.actual_end_date) || '-'}
        </div>
      </div>
    ),
  },
  {
    title: (
      <span>
        <DollarOutlined className={styles.iconMargin} />
        Бюджет
      </span>
    ),
    key: 'budget',
    width: 200,
    render: (_: any, record: ContractStage) => {
      const { planned_budget, forecasted_budget, actual_budget } = record;
      const budgetDeviation = actual_budget ? ((actual_budget - planned_budget) / planned_budget) * 100 : 0;
      return (
        <div className={styles.budgetContainer}>
          <div>
            <strong>План:</strong> {planned_budget}
          </div>
          <div>
            <strong>Прогноз:</strong> {forecasted_budget}
          </div>
          <div>
            <strong>Факт:</strong> {actual_budget || '-'}
          </div>
          {actual_budget && (
            <div className={budgetDeviationRowClass(budgetDeviation)}>
              <small>Отклонение: {budgetDeviation.toFixed(1)}%</small>
            </div>
          )}
        </div>
      );
    },
  },
  {
    title: 'Прогресс',
    key: 'progress',
    width: 150,
    render: (_: any, record: ContractStage) => {
      const plannedStart = new Date(record.planned_start_date);
      const plannedEnd = new Date(record.planned_end_date);
      const today = new Date();
      const totalDays = Math.max((plannedEnd.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24), 1);
      const passedDays = Math.max((today.getTime() - plannedStart.getTime()) / (1000 * 60 * 60 * 24), 0);
      const timeProgress = Math.min((passedDays / totalDays) * 100, 100);
      const budgetProgress = record.planned_budget > 0 ? (record.actual_budget / record.planned_budget) * 100 : 0;
      const isDelayed = timeProgress > 100 && !record.actual_end_date;
      const statusCode =
        references.contractStageStates?.find(stateRow => stateRow.id === record.state_id)?.code || 'completed';
      return (
        <div>
          <div className={styles.progressContainer}>
            <Progress
              percent={Math.round(timeProgress)}
              size='small'
              status={isDelayed ? 'exception' : 'normal'}
              strokeColor={isDelayed ? APP_COLOR_ERROR : APP_COLOR_PRIMARY}
            />
          </div>
          {statusCode === 'completed' && (
            <Tag
              bordered={false}
              icon={<CheckCircleOutlined />}
              className={`${styles.statusTag} ${styles.mutedStageTag} ${styles.tagSuccess}`}
            >
              Завершен
            </Tag>
          )}
          {statusCode === 'in_progress' && (
            <Tag
              bordered={false}
              className={`${styles.statusTag} ${styles.mutedStageTag} ${styles.tagPotential}`}
            >
              В работе
            </Tag>
          )}
          {isDelayed && statusCode !== 'completed' && (
            <Tag bordered={false} className={`${styles.statusTag} ${styles.mutedStageTag} ${styles.tagDanger}`}>
              Просрочен
            </Tag>
          )}
        </div>
      );
    },
  },
  {
    title: 'Статус',
    dataIndex: 'status_id',
    key: 'status_id',
    width: 120,
    render: (status_id: string) => {
      const status = references.contractStageStates?.find(stateRow => stateRow.id === status_id);
      const code = status?.code ?? 'planned';
      const toneClass = STAGE_STATE_TAG_CLASS[code] ?? styles.tagNeutral;
      return (
        <Tag bordered={false} className={`${styles.statusTagCentered} ${styles.mutedStageTag} ${toneClass}`}>
          {status?.name ?? '-'}
        </Tag>
      );
    },
  },
  {
    title: 'Архив',
    dataIndex: 'is_archived',
    key: 'is_archived',
    width: 80,
    render: (is_archived: boolean) => (
      <Tag
        bordered={false}
        className={`${styles.mutedStageTag} ${is_archived ? styles.tagArchive : styles.tagPotential}`}
      >
        {is_archived ? 'В архиве' : 'Активен'}
      </Tag>
    ),
  },
  {
    title: 'Обновлен',
    dataIndex: 'updated_at',
    key: 'updated_at',
    width: 120,
    render: (date: string) => formatDate(date, 'DD.MM.YYYY HH:mm'),
  },
];
export const formatCurrency = formatRub;
export const formatDate = (dateString: string | null | undefined, format: string = 'DD.MM.YYYY'): string => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (format === 'DD.MM.YYYY HH:mm') {
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return date.toLocaleDateString('ru-RU');
};
export const getRevisionColumnsData = (
  references: Pick<ReferenceData, 'contractStates'>,
): ColumnType<ContractRevision>[] => [
  {
    title: '№ Ревизии',
    dataIndex: 'revision_number',
    key: 'revision_number',
    width: 100,
    sorter: (a, b) => a.revision_number - b.revision_number,
    defaultSortOrder: 'descend',
  },
  {
    title: 'Дата создания',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 150,
    sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    render: (date: string) => formatDate(date) || '-',
  },
  {
    title: 'Дата подписания',
    dataIndex: 'date_signed',
    key: 'date_signed',
    width: 150,
    sorter: (a, b) => {
      const dateA = a.date_signed ? new Date(a.date_signed).getTime() : 0;
      const dateB = b.date_signed ? new Date(b.date_signed).getTime() : 0;
      return dateA - dateB;
    },
    render: (date: string) => (date ? formatDate(date) : '-'),
  },
  {
    title: 'Описание',
    dataIndex: 'description',
    key: 'description',
    width: 250,
    ellipsis: {
      showTitle: false,
    },
    render: (description: string, record) => (
      <Tooltip title={description || 'Нет описания'}>
        <span>{description || 'Нет описания'}</span>
      </Tooltip>
    ),
  },
  {
    title: 'Состояние',
    dataIndex: 'state_id',
    key: 'state_id',
    width: 130,
    render: (state_id: string, contract) => (
      <Tag color={getTagColorByData(getEntityById(contract?.state_id, references.contractStates)?.code)}>
        {getNameById(state_id, references.contractStates)}
      </Tag>
    ),
  },
  {
    title: 'Статус',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 100,
    render: (isActive: boolean) => <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Активен' : 'Черновик'}</Tag>,
  },
];
