import React from 'react';
import { Card, Tag, Button, Row, Col, Typography } from 'antd';
import { UpOutlined, DownOutlined, CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { ContractStage } from '../../../../../types/contract';
import { getStageStatus, getStageStatusDisplay, calculateDaysUntilDeadline, calculateBudgetDeviation } from './utils/stageHelpers';
import styles from '../../ContractDetails.module.scss';
import { StageInfoItem } from './StageInfoItem';

const { Text } = Typography;

const iconComponents = {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
};

interface StageCardProps {
  stage: ContractStage;
  contractStageStates?: any[];
  users?: any[];
  isExpanded: boolean;
  onToggle: () => void;
}

export const StageCard: React.FC<StageCardProps> = ({
  stage,
  contractStageStates,
  users,
  isExpanded,
  onToggle,
}) => {
  const stageStatus = getStageStatus(stage, contractStageStates);
  const { status, isCompleted, isInProgress, isDelayed } = stageStatus;

  const statusDisplay = getStageStatusDisplay(status);
  const { iconType, text: statusText, statusColor } = statusDisplay;
  const IconComponent = iconComponents[iconType];

  const daysUntilDeadline = calculateDaysUntilDeadline(stage.planned_end_date);
  const isOverdue = isDelayed || (daysUntilDeadline < 0 && !isCompleted);
  const budgetDeviation = calculateBudgetDeviation(stage.planned_budget, stage.actual_budget);

  const getStatusTagStyle = () => {
    if (status === 'overdue') {
      return {
        backgroundColor: 'rgba(211, 47, 47, 0.1)',
        color: '#D32F2F',
        border: '1px solid #D32F2F',
      };
    }
    if (status === 'completed') {
      return {
        backgroundColor: 'rgba(84, 177, 40, 0.1)',
        color: '#54B128',
        border: '1px solid #54B128',
      };
    }
    if (status === 'in_progress') {
      return {
        backgroundColor: 'rgba(0, 21, 41, 0.1)',
        color: '#001529',
        border: '1px solid #001529',
      };
    }
    return {
      backgroundColor: 'rgba(166, 166, 166, 0.08)',
      color: '#525252',
      border: '1px solid #A6A6A6',
    };
  };

  return (
    <Col xs={24}>
      <Card
        className={styles.stageCard}
        style={{
          borderLeft: `4px solid ${statusColor}`,
        }}
      >
        <div className={styles.stageCardHeader}>
          <div
            className={`${styles.stageHeaderLeft} ${styles.stageHeaderLeftClickable}`}
            onClick={onToggle}
          >
            <div className={styles.stageNumberWrapper}>
              <div className={styles.stageIconBadge} style={{ backgroundColor: statusColor }}>
                <IconComponent />
              </div>
              <div>
                <Text strong className={styles.stageNumber}>
                  Этап {stage.stage_number}
                </Text>
                <Text className={styles.stageName}>{stage.name}</Text>
              </div>
            </div>
          </div>
          <div className={styles.stageHeaderRight}>
            <Tag className={styles.stageStatusTag} style={getStatusTagStyle()}>
              {statusText}
            </Tag>
            {isInProgress && !isOverdue && daysUntilDeadline <= 7 && (
              <Tag
                className={styles.urgentBadge}
                style={{
                  backgroundColor: 'rgba(0, 21, 41, 0.1)',
                  color: '#001529',
                  border: '1px solid #001529',
                }}
              >
                Осталось {daysUntilDeadline} {daysUntilDeadline === 1 ? 'день' : 'дней'}
              </Tag>
            )}
            <Button
              type="text"
              icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
              onClick={onToggle}
              className={styles.toggleStageButton}
              title={isExpanded ? 'Свернуть' : 'Развернуть'}
            />
          </div>
        </div>

        {isExpanded && (
          <div className={styles.stageCardContent}>
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12} md={8}>
                <StageInfoItem
                  type="dates"
                  stage={stage}
                  daysUntilDeadline={daysUntilDeadline}
                  isOverdue={isOverdue}
                  isCompleted={isCompleted}
                  budgetDeviation={budgetDeviation}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <StageInfoItem
                  type="budget"
                  stage={stage}
                  daysUntilDeadline={daysUntilDeadline}
                  isOverdue={isOverdue}
                  isCompleted={isCompleted}
                  budgetDeviation={budgetDeviation}
                />
              </Col>
              <Col xs={24} sm={12} md={8}>
                <StageInfoItem
                  type="responsible"
                  stage={stage}
                  daysUntilDeadline={daysUntilDeadline}
                  isOverdue={isOverdue}
                  isCompleted={isCompleted}
                  budgetDeviation={budgetDeviation}
                  users={users}
                />
              </Col>
            </Row>
          </div>
        )}
      </Card>
    </Col>
  );
};
