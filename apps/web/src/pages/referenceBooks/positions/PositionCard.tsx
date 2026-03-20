import { Button, Space } from 'antd';
import { DeleteOutlined, EditOutlined, IdcardOutlined } from '@ant-design/icons';
import type { Position } from '../../../types/referenceTypes';
import styles from './PositionsListPage.module.scss';

type Props = {
  position: Position;
  onEdit: (position: Position) => void;
  onDelete: (position: Position) => void;
};

export function PositionCard({ position, onEdit, onDelete }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.cardMain}>
        <IdcardOutlined className={styles.cardIcon} />
        <div className={styles.cardTitle}>{position.name || '—'}</div>
      </div>
      <Space size="small" className={styles.cardActions}>
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => onEdit(position)}
          title="Редактировать"
        />
        <Button
          type="primary"
          danger
          icon={<DeleteOutlined />}
          onClick={() => onDelete(position)}
          title="Удалить"
        />
      </Space>
    </div>
  );
}
