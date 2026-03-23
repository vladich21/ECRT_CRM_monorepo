import React from 'react';
import { Col, Typography, Progress } from 'antd';
import styles from './MetricCard.module.scss';

const { Text } = Typography;

export interface MetricRow {
  label: string;
  value: string | number | React.ReactNode;
  isStrong?: boolean;
  className?: string;
}

export interface MetricCardProps {
  label: string;
  rows: MetricRow[];
  progress?: {
    percent: number;
    strokeColor?: string;
  };
  colProps?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  label,
  rows,
  progress,
  colProps = { xs: 24, sm: 12, md: 8, lg: 4.8 },
  className,
}) => {
  return (
    <Col {...colProps} className={styles.metricCol}>
      <div className={`${styles.metricCard} ${className || ''}`}>
        <Text className={styles.metricLabel}>{label}</Text>
        <div className={styles.metricContent}>
          {rows.map((row, index) => (
            <div key={index} className={styles.metricRow}>
              <Text type='secondary' className={styles.metricTextSecondary}>
                {row.label}
              </Text>
              <Text
                strong={row.isStrong}
                className={`${row.isStrong ? styles.metricValue : styles.metricSubtext} ${styles.metricTextValue} ${row.className || ''}`}
              >
                {row.value}
              </Text>
            </div>
          ))}
          {progress && (
            <Progress
              percent={progress.percent}
              size='small'
              strokeColor={progress.strokeColor || '#001529'}
              showInfo={false}
              className={`${styles.metricProgress} ${styles.metricProgressWrapper}`}
            />
          )}
        </div>
      </div>
    </Col>
  );
};

export default MetricCard;
