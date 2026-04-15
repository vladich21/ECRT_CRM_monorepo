import {
  CalendarOutlined,
  FileProtectOutlined,
  FileTextOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Tag } from 'antd';

import {
  getPatentRecordSurface,
  getPatentRidWorkflowSurface,
  mutedTagStyle,
} from '@/constants/statusBadgeSurfaces';
import { getNameById } from '@/helpers/getNameById';
import type { Patent } from '@/types/patent';
import { formatPatentGrantIssueDateRu } from '@/pages/referenceBooks/patentGrants/utils/patentGrantCardHelpers';
import {
  patentGrantStatusTagInlineStyle,
  patentGrantStatusTagPreset,
} from '@/pages/referenceBooks/patentGrants/constants/patentGrantStatusStyles';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import styles from '../../PatentsListPage.module.scss';

function formatDate(dateStr: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '—';
}

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
  const deptName = getNameById(patent.department_id, refs?.departments) || '';
  const deletedSurface = getPatentRecordSurface(true);
  const ridSurface = getPatentRidWorkflowSurface(statusName);
  const grantsCount = patent.patent_grants_count ?? 0;
  const grantsPreview = patent.patent_grants_preview ?? [];
  const moreGrants = grantsCount > grantsPreview.length ? grantsCount - grantsPreview.length : 0;

  return (
    <div
      className={styles.card}
      {...(patent.is_deleted ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(patent)}
    >
      {/* Основная информация */}
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
      <span className={styles.metaNumber}>
            <div style={{ fontSize: 16, marginRight: 4, fontWeight: 700}}>№ {patent.registration_number || '—'}</div>
          </span>
          <span className={styles.name}>{patent.name || '—'}</span>
        </div>
        <div className={styles.metaRow}>
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
         
        </div>
        {ipTypeName && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
            <span>{ipTypeName}</span>
          </div>
        )}
        {deptName && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
            <span className={styles.metaText}>
              <TeamOutlined style={{ fontSize: 11 }} />
              {deptName}
            </span>
          </div>
        )}
      </div>

      {grantsCount > 0 && (
        <div className={styles.grantsCol}>
          <div className={styles.grantsHeading}>
            <FileProtectOutlined style={{ fontSize: 11, marginRight: 6 }} />
            Охранные документы{grantsCount > 1 ? ` (${grantsCount})` : ''}
          </div>
          {grantsPreview.map((previewItem, index) => {
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
          {moreGrants > 0 && (
            <div
              className={styles.grantMore}
              title='Откройте карточку РИД и перейдите в раздел «Охранные документы», там полный список.'
            >
              {grantsRemainderLabel(moreGrants)} — полный список в карточке РИД
            </div>
          )}
        </div>
      )}

      {/* Дата регистрации + исполнители */}
      <div className={styles.metricsCol}>
        <div className={styles.statsBlock}>
          <div className={styles.statValue}>
            <CalendarOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {formatDate(patent.registration_date)}
          </div>
          <div className={styles.statLabel}>Дата регистрации</div>
        </div>
        {patent.author_ids?.length > 0 && (
          <div className={styles.periodInfo}>
            <FileTextOutlined style={{ fontSize: 11 }} />
            {patent.author_ids.length}{' '}
            {patent.author_ids.length === 1
              ? 'исполнитель'
              : patent.author_ids.length <= 4
                ? 'исполнителя'
                : 'исполнителей'}
          </div>
        )}
      </div>

      {/* Стрелка */}
      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
