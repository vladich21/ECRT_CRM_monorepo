import {
  AimOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  EnvironmentOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Progress } from 'antd';

import type { Partner } from '../../../types/partner';
import type { PartnerSupplierEvalKpi } from '../../../utils/supplierEvaluationPartnerKpi';
import type { InitialSupplierEvaluation } from '../../../types/supplierEvaluation';
import { PartnerNextEvalDateTags } from '../evaluations/partnerEvalKpiDisplay';
import { scoreColor } from '../evaluations/supplierEvaluationUi';
import styles from './SupplierCard.module.scss';

interface SupplierCardProps {
  partner: Partner;
  references?: {
    partnerStatuses?: Array<{ id: string; name: string }>;
    partnerTypes?: Array<{ id: string; name: string }>;
    competencies?: Array<{ id: string; name: string }>;
  };
  evaluationKpi?: PartnerSupplierEvalKpi;
  evaluationKpiLoading?: boolean;
  evaluationKpiDaysHint?: string;
  initialEvaluation?: InitialSupplierEvaluation | null;
  initialEvaluationLoading?: boolean;
  onClick: (partner: Partner) => void;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  Активный: styles.tagActive,
  Потенциальный: styles.tagPotential,
  Заблокирован: styles.tagBlocked,
  Архив: styles.tagArchive,
};

function statusBadgeClass(statusName: string): string {
  return STATUS_BADGE_CLASS[statusName] ?? styles.tagFallback;
}

function projectsCountLabel(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'проект';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'проекта';
  return 'проектов';
}

export default function SupplierCard({
  partner,
  references,
  evaluationKpi,
  evaluationKpiLoading,
  evaluationKpiDaysHint,
  initialEvaluation,
  initialEvaluationLoading,
  onClick,
}: SupplierCardProps) {
  const statusName =
    references?.partnerStatuses?.find(status => status.id === partner.status_id)?.name ?? '—';
  const typeNames = (partner.type_ids ?? [])
    .map(typeId => references?.partnerTypes?.find(partnerType => partnerType.id === typeId)?.name)
    .filter(Boolean);

  const hasProjectAvg = evaluationKpi?.avgScore != null;
  const avgScore = evaluationKpi?.avgScore ?? (initialEvaluation?.weighted_score ?? null);
  const blockedCount = evaluationKpi?.blockedProjectCount ?? 0;
  const reevalOverdue = evaluationKpi?.nextReevaluationOverdue ?? false;
  const isStatusBlocked = statusName === 'Заблокирован';

  const dangerStripe = blockedCount > 0 || reevalOverdue || isStatusBlocked;

  const progressPercent = avgScore == null ? 0 : Math.min(100, Math.round((avgScore / 5) * 100));
  const scoreStroke = avgScore == null ? '#d9d9d9' : scoreColor(avgScore);
  return (
    <div
      className={styles.card}
      {...(dangerStripe ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(partner)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{partner.name?.trim() ? partner.name : '—'}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={`${styles.mutedTag} ${statusBadgeClass(statusName)}`}>{statusName}</span>
          {!evaluationKpiLoading && avgScore == null ? (
            <span className={`${styles.mutedTag} ${styles.tagNeutral}`}>Не оценён</span>
          ) : null}
          {partner.is_approved ? (
            <span className={styles.chipApproved}>
              <CheckCircleFilled className={styles.chipIcon} />
              Утверждён
            </span>
          ) : (
            <span className={styles.chipNotApproved}>
              <ClockCircleFilled className={styles.chipIcon} />
              Не утверждён
            </span>
          )}
          {partner.is_key_supplier ? (
            <span className={styles.chipKey}>
              <StarFilled className={styles.chipIcon} />
              Ключевой
            </span>
          ) : null}
          {partner.is_targeted ? (
            <span className={styles.chipTarget}>
              <AimOutlined className={styles.chipIcon} />
              Целевой
            </span>
          ) : null}
          {!evaluationKpiLoading && reevalOverdue && avgScore != null ? (
            <span className={`${styles.mutedTag} ${styles.tagBlocked}`}>Просрочена</span>
          ) : null}
          {!evaluationKpiLoading && blockedCount > 0 ? (
            <span className={`${styles.mutedTag} ${styles.tagBlocked}`}>
              Заблокирован · {blockedCount} {projectsCountLabel(blockedCount)}
            </span>
          ) : null}
          <span className={styles.metaInn}>
            <BankOutlined style={{ fontSize: 11, marginRight: 4 }} />
            ИНН {partner.inn || '—'}
          </span>
        </div>
        {typeNames.length > 0 && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
            <span>{typeNames.join(', ')}</span>
          </div>
        )}
        {partner.actual_address && (
          <div className={`${styles.metaRow} ${styles.metaSubRow}`}>
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
              <SafetyCertificateOutlined />{' '}
              {hasProjectAvg
                ? 'По проектам'
                : avgScore != null
                  ? 'Первичная оценка'
                  : 'Средняя оценка'}
            </span>
            <span className={styles.complianceScore} style={{ color: scoreStroke }}>
              {evaluationKpiLoading || (!hasProjectAvg && initialEvaluationLoading)
                ? '…'
                : avgScore == null
                  ? '—'
                  : avgScore.toFixed(2)}
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
        <div className={styles.contractsCount}>
          <CalendarOutlined />
          <div className={styles.nextEvalCol}>
            <span className={styles.nextEvalLine}>
              <span className={styles.nextEvalLabel}>Следующая оценка:</span>{' '}
              {evaluationKpiLoading || (!hasProjectAvg && initialEvaluationLoading) ? (
                '…'
              ) : evaluationKpi?.nextReevaluationIso ? (
                <PartnerNextEvalDateTags nextIso={evaluationKpi.nextReevaluationIso} layout='registry' />
              ) : initialEvaluation?.next_reevaluation_date ? (
                <PartnerNextEvalDateTags nextIso={initialEvaluation.next_reevaluation_date} layout='registry' />
              ) : (
                <span className={`${styles.mutedTag} ${styles.tagNeutral}`}>—</span>
              )}
            </span>
            {evaluationKpiDaysHint ? (
              <div className={styles.evalKpiDaysHint}>{evaluationKpiDaysHint}</div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
