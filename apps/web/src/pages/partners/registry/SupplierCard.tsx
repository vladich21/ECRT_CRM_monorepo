import {
  BankOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { CSSProperties } from 'react';
import { Progress, Tag } from 'antd';

import type { Partner } from '../../../types/partner';
import type { PartnerSupplierEvalKpi } from '../../../utils/supplierEvaluationPartnerKpi';
import { PartnerNextEvalDateTags } from '../evaluations/partnerEvalKpiDisplay';
import { isNextReevaluationInSoonWindow, scoreColor } from '../evaluations/supplierEvaluationUi';
import styles from './SupplierCard.module.scss';

interface SupplierCardProps {
  partner: Partner;
  references?: {
    partnerStatuses?: Array<{ id: string; name: string }>;
    partnerTypes?: Array<{ id: string; name: string }>;
    competencies?: Array<{ id: string; name: string; color_bg?: string; color_text?: string; color_border?: string }>;
  };
  /** Сводка по активным оценкам проектов (средний балл и ближайшая переоценка). */
  evaluationKpi?: PartnerSupplierEvalKpi;
  evaluationKpiLoading?: boolean;
  onClick: (partner: Partner) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Активный: '#52c41a',
  Потенциальный: '#1677ff',
  Заблокирован: '#ff4d4f',
  Архив: '#8c8c8c',
};

export default function SupplierCard({
  partner,
  references,
  evaluationKpi,
  evaluationKpiLoading,
  onClick,
}: SupplierCardProps) {
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name ?? '—';
  const statusColor = STATUS_COLORS[statusName] ?? '#1677ff';
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);

  const avgScore = evaluationKpi?.avgScore ?? null;
  const progressPercent = avgScore == null ? 0 : Math.min(100, Math.round((avgScore / 5) * 100));
  const scoreStroke = avgScore == null ? '#d9d9d9' : scoreColor(avgScore);

  return (
    <div
      className={styles.card}
      style={{ '--status-color': statusColor } as CSSProperties}
      onClick={() => onClick(partner)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{partner.short_name || partner.name}</span>
          <span className={styles.metaInn}>
            <BankOutlined style={{ fontSize: 11, marginRight: 4 }} />
            ИНН {partner.inn || '—'}
          </span>
        </div>
        <div className={styles.metaRow}>
          <Tag color={statusColor} style={{ fontSize: 14 }}>
            {statusName}
          </Tag>
          {!evaluationKpiLoading && avgScore == null && (
            <Tag color='default' style={{ fontSize: 14, margin: 0 }}>
              Не оценён
            </Tag>
          )}
        </div>
        {typeNames.length > 0 && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span>{typeNames.join(', ')}</span>
          </div>
        )}
        {partner.actual_address && (
          <div className={styles.metaRow} style={{ marginTop: 2 }}>
            <span className={styles.metaCity}>
              <EnvironmentOutlined style={{ fontSize: 11 }} />
              {partner.actual_address}
            </span>
          </div>
        )}
      </div>

      <div className={styles.metricsCol}>
        <div className={styles.complianceBlock}>
          <div className={styles.complianceHeader}>
            <span className={styles.complianceLabel}>
              <SafetyCertificateOutlined /> Средняя оценка
            </span>
            <span className={styles.complianceScore} style={{ color: scoreStroke }}>
              {evaluationKpiLoading ? '…' : avgScore == null ? '—' : avgScore.toFixed(2)}
            </span>
          </div>
          <Progress
            percent={progressPercent}
            showInfo={false}
            size='small'
            strokeColor={scoreStroke}
            trailColor='#f0f0f0'
          />
        </div>
        <div
          className={
            !evaluationKpiLoading && isNextReevaluationInSoonWindow(evaluationKpi?.nextReevaluationIso)
              ? `${styles.contractsCount} ${styles.contractsCountSoon}`
              : styles.contractsCount
          }
        >
          <CalendarOutlined />
          <span className={styles.nextEvalLine}>
            <span className={styles.nextEvalLabel}>Следующая оценка:</span>{' '}
            {evaluationKpiLoading ? (
              '…'
            ) : evaluationKpi?.nextReevaluationIso ? (
              <PartnerNextEvalDateTags nextIso={evaluationKpi.nextReevaluationIso} />
            ) : (
              <Tag style={{ margin: 0 }}>—</Tag>
            )}
          </span>
        </div>
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
