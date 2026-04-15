import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Tag, Tooltip } from 'antd';

import type { PatentGrant } from '../../../../types/patent';
import { patentGrantStatusTagInlineStyle, patentGrantStatusTagPreset } from '../constants/patentGrantStatusStyles';
import { buildPatentGrantRidDescription, formatPatentGrantIssueDateRu } from '../utils/patentGrantCardHelpers';
import styles from './PatentGrantListCard.module.scss';

export type PatentGrantListCardProps = {
  grant: PatentGrant;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function PatentGrantListCard({ grant, onClick, onEdit, onDelete }: PatentGrantListCardProps) {
  const title = grant.grant_number || '—';
  const aside = formatPatentGrantIssueDateRu(grant.grant_date) || undefined;
  const useTwoCol = Boolean(aside?.trim());
  const leftClassName = useTwoCol ? `${styles.left} ${styles.leftGrid}` : styles.left;
  const officeLine = grant.office?.trim() ?? '';
  const ridDescription = buildPatentGrantRidDescription(grant);
  const statusColor = patentGrantStatusTagPreset(grant.status);
  const metadataRow = officeLine || ridDescription ? (
    <div className={styles.metadataRow}>
      {officeLine ? <span className={styles.office}>{officeLine}</span> : null}
      {officeLine && ridDescription ? <span className={styles.dot}>·</span> : null}
      {ridDescription ? <span className={styles.description}>{ridDescription}</span> : null}
    </div>
  ) : null;

  const titleRow = (
    <div className={styles.titleRow}>
      <div className={styles.title} title={title}>
        {title}
      </div>
      {grant.status ? (
        <Tag
          bordered={false}
          color={statusColor}
          className={styles.statusTag}
          style={patentGrantStatusTagInlineStyle(grant.status)}
        >
          {grant.status}
        </Tag>
      ) : null}
    </div>
  );

  const mainBlock = (
    <>
      {titleRow}
      {metadataRow}
    </>
  );

  return (
    <div className={styles.card}>
      <div
        className={leftClassName}
        role='button'
        tabIndex={0}
        onClick={onClick}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{ cursor: 'pointer' }}
      >
        {useTwoCol ? (
          <>
            <div className={styles.mainCol}>{mainBlock}</div>
            <div className={styles.aside}>{aside}</div>
          </>
        ) : (
          mainBlock
        )}
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
