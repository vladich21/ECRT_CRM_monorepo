import { FileProtectOutlined, FileTextOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import {
  getPatentRecordSurface,
  getPatentRidWorkflowSurface,
  mutedTagStyle,
} from '@/constants/statusBadgeSurfaces';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import type { Patent } from '@/types/patent';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import { formatPatentRegistryCardHeading } from '@/pages/patents/utils/patentRegistryCardUtils';
import { formatPatentGrantIssueDateRu } from '@/pages/referenceBooks/patentGrants/utils/patentGrantCardHelpers';
import {
  patentGrantStatusTagInlineStyle,
  patentGrantStatusTagPreset,
} from '@/pages/referenceBooks/patentGrants/constants/patentGrantStatusStyles';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import styles from '../../PatentsListPage.module.scss';

const MAX_GRANT_MINI_CARDS_IN_LIST = 2;

function grantsRemainderLabel(remainderCount: number): string {
  if (remainderCount === 1) {
    return 'Ещё 1 документ';
  }
  if (remainderCount >= 2 && remainderCount <= 4) {
    return `Ещё ${remainderCount} документа`;
  }
  return `Ещё ${remainderCount} документов`;
}

type Props = {
  patent: Patent;
  refs: ReferenceDataForPatents;
  onClick: (patent: Patent) => void;
};

export function PatentCard({ patent, refs, onClick }: Props) {
  const ipTypeName = getNameById(patent.intellectprop_id, refs?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, refs?.patentStatuses) || '';
  const responsibleName = getNameById(patent.responsible_for_patenting_id, refs?.users ?? []) || '—';
  const deletedSurface = getPatentRecordSurface(true);
  const ridSurface = getPatentRidWorkflowSurface(statusName);
  const projectEntity = getEntityById(patent.project_id, refs?.projects ?? []);
  const projectLabel = formatProjectChipLabel(projectEntity);
  const heading = formatPatentRegistryCardHeading(patent);

  const grantsCount = patent.patent_grants_count ?? 0;
  const grantsPreview = patent.patent_grants_preview ?? [];
  const moreGrants = grantsCount > grantsPreview.length ? grantsCount - grantsPreview.length : 0;
  const visibleGrantsPreview = grantsPreview.slice(0, MAX_GRANT_MINI_CARDS_IN_LIST);
  const hiddenInPreview = Math.max(0, grantsPreview.length - visibleGrantsPreview.length);
  const collapsedGrantsTotal = hiddenInPreview + moreGrants;

  return (
    <div
      className={styles.card}
      {...(patent.is_deleted ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(patent)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.cardHeading}>{heading}</div>
        <div className={styles.responsibleRow}>
          <UserOutlined style={{ fontSize: 14, flexShrink: 0 }} />
          <span className={styles.responsibleName}>{responsibleName}</span>
        </div>
        <div className={styles.chipsRow}>
          {patent.is_deleted ? (
            <Tag bordered={false} style={mutedTagStyle(deletedSurface, { fontSize: 12 })}>
              Удалён
            </Tag>
          ) : statusName ? (
            <Tag bordered={false} style={mutedTagStyle(ridSurface, { fontSize: 12 })}>
              {statusName}
            </Tag>
          ) : (
            <Tag bordered={false} style={mutedTagStyle(ridSurface, { fontSize: 12 })}>
              Статус не указан
            </Tag>
          )}
          {ipTypeName ? <Tag className={`${styles.typeChip} ${styles.chipTight}`}>{ipTypeName}</Tag> : null}
          {projectLabel ? (
            <Tag className={`${styles.projectChip} ${styles.chipTight}`}>{projectLabel}</Tag>
          ) : null}
        </div>
        {patent.author_ids?.length > 0 ? (
          <div className={styles.authorsMetaRow}>
            <FileTextOutlined style={{ fontSize: 12 }} />
            <span>
              {patent.author_ids.length}{' '}
              {patent.author_ids.length === 1
                ? 'исполнитель'
                : patent.author_ids.length <= 4
                  ? 'исполнителя'
                  : 'исполнителей'}
            </span>
          </div>
        ) : null}
      </div>

      <div className={styles.cardTrailing}>
        {grantsCount > 0 ? (
          <div className={styles.grantsCol}>
            <div className={styles.grantsHeading}>
              <FileProtectOutlined style={{ fontSize: 11, marginRight: 6 }} />
              Охранные документы{grantsCount > 1 ? ` (${grantsCount})` : ''}
            </div>
            {visibleGrantsPreview.map((previewItem, index) => {
              const grantTitle = previewItem.grant_number?.trim() || '—';
              const grantStatusLabel = previewItem.status?.trim() ?? '';
              const officeLabel = previewItem.office?.trim() ?? '';
              const issuedLabel = formatPatentGrantIssueDateRu(previewItem.grant_date);
              const statusColor = patentGrantStatusTagPreset(grantStatusLabel);
              const tooltipParts = [grantTitle, grantStatusLabel, officeLabel, issuedLabel].filter(Boolean);
              return (
                <div
                  key={`${patent.id}-grant-${index}`}
                  className={styles.grantMiniCard}
                  title={tooltipParts.join(' — ')}
                >
                  <div className={styles.grantMiniTitleRow}>
                    <div className={styles.grantMiniTitle}>{grantTitle}</div>
                    <Tag
                      bordered={false}
                      color={statusColor}
                      className={styles.grantMiniMeta}
                      style={patentGrantStatusTagInlineStyle(grantStatusLabel)}
                    >
                      {grantStatusLabel || '—'}
                    </Tag>
                  </div>
                  {officeLabel || issuedLabel ? (
                    <div className={styles.grantMiniSubtitle}>
                      <span className={styles.grantMiniOffice}>{officeLabel}</span>
                      <span className={styles.grantMiniIssued}>{issuedLabel}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {collapsedGrantsTotal > 0 && (
              <div
                className={styles.grantMore}
                title='Откройте карточку РИД и перейдите в раздел «Охранные документы», там полный список.'
              >
                {grantsRemainderLabel(collapsedGrantsTotal)} — полный список в карточке РИД
              </div>
            )}
          </div>
        ) : null}
        <div className={styles.activityCol}>
          <RightOutlined className={styles.arrow} />
        </div>
      </div>
    </div>
  );
}
