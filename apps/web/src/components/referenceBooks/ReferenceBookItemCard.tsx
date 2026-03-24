import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';

import styles from './ReferenceBookItemCard.module.scss';

type Props = {
  title: string;
  metaText?: string;
  subtitle?: string;
  description?: string;
  previewBgColor?: string;
  previewTextColor?: string;
  previewBorderColor?: string;
  previewText?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};
export function ReferenceBookItemCard({
  title,
  metaText,
  subtitle,
  description,
  previewBgColor,
  previewTextColor,
  previewBorderColor,
  previewText,
  onClick,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className={styles.card}>
      <div
        className={styles.left}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={
          onClick
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        style={onClick ? { cursor: 'pointer' } : undefined}
      >
        <div className={styles.titleRow}>
          <div className={styles.title} title={title}>
            {title || '—'}
          </div>
          {metaText ? <div className={styles.meta}>{metaText}</div> : null}
        </div>

        {subtitle ? <div className={styles.subtitle}>{subtitle}</div> : null}
        {description ? <div className={styles.description}>{description}</div> : null}
        {previewBgColor && previewTextColor ? (
          <div>
            <span
              className={styles.previewTag}
              style={{
                backgroundColor: previewBgColor,
                color: previewTextColor,
                borderColor: previewBorderColor || 'transparent',
              }}
            >
              {previewText || 'Пример текста'}
            </span>
          </div>
        ) : null}
      </div>

      <div className={styles.actions}>
        {onEdit ? (
          <Tooltip>
            <Button
              className={styles.actionBtn}
              icon={<EditOutlined />}
              onClick={e => {
                e.stopPropagation();
                onEdit();
              }}
            />
          </Tooltip>
        ) : null}
        {onDelete ? (
          <Tooltip>
            <Button
              danger
              className={styles.actionBtn}
              icon={<DeleteOutlined />}
              onClick={e => {
                e.stopPropagation();
                onDelete();
              }}
            />
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
