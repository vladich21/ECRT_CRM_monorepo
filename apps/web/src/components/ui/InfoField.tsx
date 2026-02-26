import React from 'react';
import { Col, Typography } from 'antd';
import styles from './InfoField.module.scss';

const { Text } = Typography;

export interface InfoFieldProps {
  label: string;
  value: string | number | React.ReactNode;
  colProps?: {
    xs?: number;
    sm?: number;
    md?: number;
  };
  className?: string;
}

const InfoField: React.FC<InfoFieldProps> = ({
  label,
  value,
  colProps = { xs: 24, sm: 12, md: 8 },
  className,
}) => {
  return (
    <Col {...colProps} className={className}>
      <Text type="secondary" className={styles.infoFieldLabel}>
        {label}
      </Text>
      <Text className={styles.infoFieldValue}>{value}</Text>
    </Col>
  );
};

export default InfoField;
