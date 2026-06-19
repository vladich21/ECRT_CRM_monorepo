import {
  AppstoreOutlined,
  AimOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  StarFilled,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { Progress } from 'antd';

import type { Partner } from '../../../types/partner';
import type { PartnerSupplierEvalKpi } from '../../../utils/supplierEvaluationPartnerKpi';
import type { InitialSupplierEvaluation } from '../../../types/supplierEvaluation';
import { inferPartnerCategoryKind } from '../../../utils/partnerApproval';
import { PartnerNextEvalDateTags } from '../evaluations/partnerEvalKpiDisplay';
import { formatEvaluationScoreDisplay, scoreColor } from '../evaluations/supplierEvaluationUi';
import { getPartnerListDisplayName } from '../utils/partnersListDisplayUtils';
import styles from './SupplierCard.module.scss';

interface SupplierCardProps {
  partner: Partner;
  references?: {
    partnerStatuses?: Array<{ id: string; name: string }>;
    partnerCategories?: Array<{ id: string; name: string }>;
    partnerTypes?: Array<{ id: string; name: string }>;
    competencies?: Array<{ id: string; name: string }>;
  };
  evaluationKpi?: PartnerSupplierEvalKpi;
  evaluationKpiLoading?: boolean;
  evaluationKpiDaysHint?: string;
  initialEvaluation?: InitialSupplierEvaluation | null;
  initialEvaluationLoading?: boolean;
  detailTo: string;
  detailState?: Record<string, unknown>;
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

function projectsCountLabel(projectCount: number): string {
  const lastDigit = projectCount % 10;
  const lastTwoDigits = projectCount % 100;
  if (lastDigit === 1 && lastTwoDigits !== 11) return 'проект';
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) return 'проекта';
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
  detailTo,
  detailState,
}: SupplierCardProps) {
  const statusName =
    references?.partnerStatuses?.find(status => status.id === partner.status_id)?.name ?? '—';
  const listStatusName = partner.is_deleted ? 'Удален' : statusName;
  const listStatusClass = partner.is_deleted ? styles.tagDeleted : statusBadgeClass(statusName);
  const categoryName =
    references?.partnerCategories?.find(category => String(category.id) === String(partner.category_id))?.name ?? '';
  const typeNames = (partner.type_ids ?? [])
    .map(typeId => references?.partnerTypes?.find(partnerType => partnerType.id === typeId)?.name)
    .filter(Boolean);

  const hasProjectAvg = evaluationKpi?.avgScore != null;
  const avgScore = evaluationKpi?.avgScore ?? (initialEvaluation?.weighted_score ?? null);
  const blockedCount = evaluationKpi?.blockedProjectCount ?? 0;
  const reevalOverdue = evaluationKpi?.nextReevaluationOverdue ?? false;
  const isStatusBlocked = statusName === 'Заблокирован';
  const categoryKind = inferPartnerCategoryKind(categoryName || null);
  const isEngineeringCategory = categoryKind === 'engineering';
  const isResourceCategory = categoryKind === 'resource';
  const evaluationRequired = partner.evaluation_required ?? 'none';
  const showRequiredMissing = evaluationRequired === 'missing';
  const showRequiredOverdue = evaluationRequired === 'overdue';

  const displayName = getPartnerListDisplayName(partner);

  const dangerStripe = blockedCount > 0 || reevalOverdue || isStatusBlocked;

  const progressPercent = avgScore == null ? 0 : Math.min(100, Math.round((avgScore / 5) * 100));
  const scoreStroke = avgScore == null ? '#d9d9d9' : scoreColor(avgScore);
  return (
    <Link
      to={detailTo}
      state={detailState}
      className={styles.card}
      {...(dangerStripe ? { 'data-danger-stripe': true as const } : {})}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{displayName}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={`${styles.mutedTag} ${listStatusClass}`}>{listStatusName}</span>
          {isEngineeringCategory ? (
            <span className={styles.chipCategoryEngineering}>
              <ToolOutlined className={styles.chipIcon} />
              Инжиниринговый
            </span>
          ) : null}
          {isResourceCategory ? (
            <span className={styles.chipCategoryResource}>
              <AppstoreOutlined className={styles.chipIcon} />
              Ресурсный
            </span>
          ) : null}
          {partner.is_approved ? (
            <span className={styles.chipApproved}>
              <CheckCircleFilled className={styles.chipIcon} />
              Утвержден
            </span>
          ) : (
            <span className={styles.chipNotApproved}>
              <ClockCircleFilled className={styles.chipIcon} />
              Не утвержден
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
          {showRequiredMissing ? (
            <span className={styles.chipEvalRequiredMissing}>
              <WarningOutlined className={styles.chipIcon} />
              Требуется первичная оценка
            </span>
          ) : null}
          {showRequiredOverdue ? (
            <span className={styles.chipEvalRequiredOverdue}>
              <ExclamationCircleOutlined className={styles.chipIcon} />
              Требуется переоценка · Просрочена
            </span>
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
                  : formatEvaluationScoreDisplay(avgScore)}
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
        {hasProjectAvg ? (
          <div className={styles.contractsCount}>
            <CalendarOutlined />
            <div className={styles.nextEvalCol}>
              <span className={styles.nextEvalLine}>
                <span className={styles.nextEvalLabel}>Следующая оценка:</span>{' '}
                {evaluationKpiLoading || (!hasProjectAvg && initialEvaluationLoading) ? (
                  '…'
                ) : evaluationKpi?.nextReevaluationIso ? (
                  <PartnerNextEvalDateTags nextIso={evaluationKpi.nextReevaluationIso} layout='registry' />
                ) : (
                  <span className={`${styles.mutedTag} ${styles.tagNeutral}`}>—</span>
                )}
              </span>
              {evaluationKpiDaysHint ? (
                <div className={styles.evalKpiDaysHint}>{evaluationKpiDaysHint}</div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </Link>
  );
}
