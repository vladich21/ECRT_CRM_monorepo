import React from 'react';
import { Typography, Tag } from 'antd';
import { CalendarOutlined, DollarOutlined, UserOutlined } from '@ant-design/icons';
import { ContractStage } from '../../../../../types/contract';
import { getNameById } from '../../../../../helpers/getNameById';
import { formatDate } from './data';
import { getDeadlineCountdownTone, getDeadlineCountdownTagStyle, pluralDaysRu } from './utils/stageHelpers';
import styles from '../../ContractDetails.module.scss';
const { Text } = Typography;
interface StageInfoItemProps {
  type: 'dates' | 'budget' | 'responsible';
  stage: ContractStage;
  daysUntilDeadline: number;
  isOverdue: boolean;
  isCompleted: boolean;
  budgetDeviation: number | null;
  users?: any[];
}
const formatDateValue = (date: string | null | undefined): string => {
  return date ? formatDate(date) : '-';
};
export const StageInfoItem: React.FC<StageInfoItemProps> = ({
  type,
  stage,
  daysUntilDeadline,
  isOverdue,
  isCompleted,
  budgetDeviation,
  users,
}) => {
  if (type === 'dates') {
    return (
      <div className={styles.stageInfoItem}>
        <div className={styles.stageInfoHeader}>
          <CalendarOutlined className={styles.stageInfoIcon} />
          <Text className={styles.stageInfoLabel}>Сроки выполнения</Text>
        </div>
        <div className={styles.stageInfoValue}>
          <div className={styles.stageInfoRow}>
            <Text type='secondary' className={styles.stageInfoTextSecondary}>
              План:{' '}
            </Text>
            <Text className={styles.stageInfoText}>
              {formatDate(stage.planned_start_date)} — {formatDate(stage.planned_end_date)}
            </Text>
          </div>
          {(stage.actual_start_date || stage.actual_end_date) && (
            <div className={styles.stageInfoRow}>
              <Text type='secondary' className={styles.stageInfoTextSecondary}>
                Факт:{' '}
              </Text>
              <Text className={styles.stageInfoText}>
                {formatDateValue(stage.actual_start_date)} — {formatDateValue(stage.actual_end_date)}
              </Text>
            </div>
          )}
          {!isCompleted && stage.planned_end_date && (
            <div className={`${styles.stageInfoRow} ${styles.stageInfoRowSpaced}`}>
              <Tag
                className={styles.timeTag}
                style={getDeadlineCountdownTagStyle(
                  getDeadlineCountdownTone(daysUntilDeadline, { isCompleted, isOverdue }),
                )}
              >
                {isOverdue ? 'Просрочено' : 'Осталось'}: {Math.abs(daysUntilDeadline)} {pluralDaysRu(daysUntilDeadline)}
              </Tag>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (type === 'budget') {
    return (
      <div className={styles.stageInfoItem}>
        <div className={styles.stageInfoHeader}>
          <DollarOutlined className={styles.stageInfoIcon} />
          <Text className={styles.stageInfoLabel}>Бюджет</Text>
        </div>
        <div className={styles.stageInfoValue}>
          {stage.planned_budget > 0 || stage.forecasted_budget > 0 || stage.actual_budget > 0 ? (
            <>
              {stage.planned_budget > 0 && (
                <div className={styles.stageInfoRow}>
                  <Text type='secondary' className={styles.stageInfoTextSecondary}>
                    План:{' '}
                  </Text>
                  <Text strong className={styles.stageInfoTextStrong}>
                    {stage.planned_budget.toLocaleString('ru-RU')} ₽
                  </Text>
                </div>
              )}
              {stage.forecasted_budget > 0 && (
                <div className={styles.stageInfoRow}>
                  <Text type='secondary' className={styles.stageInfoTextSecondary}>
                    Прогноз:{' '}
                  </Text>
                  <Text className={styles.stageInfoText}>{stage.forecasted_budget.toLocaleString('ru-RU')} ₽</Text>
                </div>
              )}
              {stage.actual_budget > 0 && (
                <div className={styles.stageInfoRow}>
                  <Text type='secondary' className={styles.stageInfoTextSecondary}>
                    Факт:{' '}
                  </Text>
                  <Text strong className={styles.stageInfoTextStrong}>
                    {stage.actual_budget.toLocaleString('ru-RU')} ₽
                  </Text>
                  {budgetDeviation !== null && (
                    <Tag
                      className={styles.budgetTag}
                      style={{
                        backgroundColor:
                          budgetDeviation > 0
                            ? 'rgba(211, 47, 47, 0.1)'
                            : budgetDeviation < 0
                              ? 'rgba(84, 177, 40, 0.1)'
                              : 'rgba(217, 217, 217, 0.1)',
                        color: budgetDeviation > 0 ? '#D32F2F' : budgetDeviation < 0 ? '#54B128' : '#525252',
                        border:
                          budgetDeviation > 0
                            ? '1px solid #D32F2F'
                            : budgetDeviation < 0
                              ? '1px solid #54B128'
                              : '1px solid #D9D9D9',
                      }}
                    >
                      {budgetDeviation > 0 ? '+' : ''}
                      {budgetDeviation.toFixed(1)}%
                    </Tag>
                  )}
                </div>
              )}
            </>
          ) : (
            <Text type='secondary' className={styles.stageInfoTextEmpty}>
              Не указан
            </Text>
          )}
        </div>
      </div>
    );
  }
  if (type === 'responsible') {
    return (
      <div className={styles.stageInfoItem}>
        <div className={styles.stageInfoHeader}>
          <UserOutlined className={styles.stageInfoIcon} />
          <Text className={styles.stageInfoLabel}>Ответственный</Text>
        </div>
        <div className={styles.stageInfoValue}>
          <Text className={styles.stageInfoText}>{getNameById(stage.responsible_id, users) || 'Не назначен'}</Text>
          {isCompleted && stage.actual_end_date && (
            <div className={styles.completedInfo}>
              <Text className={styles.completedText}>Завершен {formatDate(stage.actual_end_date)}</Text>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};
