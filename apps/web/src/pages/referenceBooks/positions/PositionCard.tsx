import { Button } from 'antd';
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
      <div className={styles.cardActions}>
        <Button
          className={styles.actionBtn}
          icon={<EditOutlined />}
          onClick={() => onEdit(position)}
          aria-label="Редактировать"
          title="Редактировать"
        />
        <Button
          danger
          className={styles.actionBtn}
          icon={<DeleteOutlined />}
          onClick={() => onDelete(position)}
          aria-label="Удалить"
          title="Удалить"
        />
      </div>
    </div>
  );
}
