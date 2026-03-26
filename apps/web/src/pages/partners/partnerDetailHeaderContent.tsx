import type { ReactNode } from 'react';
import {
  AimOutlined,
  BankOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  SafetyCertificateOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Tag, Tooltip } from 'antd';

import type { Partner } from '../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../utils/partnerApproval';
import type { PartnerSupplierEvalKpi } from '../../utils/supplierEvaluationPartnerKpi';
import headerStyles from '../../components/pageLayout/DetailPageHeader.module.scss';
import { PartnerHeaderAvgScoreTag, PartnerNextEvalDateTags } from './evaluations/partnerEvalKpiDisplay';

export type PartnerDetailHeaderBadgeOptions = {
  categoryName?: string | null;
  approvalPreviewDraft?: {
    legalCheckPassed: boolean;
    questionnaireFilled: boolean;
    initialAssessmentDone: boolean;
    hasActiveEvaluationBlock: boolean;
  };
};

/** Для страницы редактирования: превью бейджа по форме; блок по оценке — из последнего ответа API. */
export function partnerEditBadgeOptions(
  displayPartner: Partner,
  savedPartner: Partner,
  categoryName: string | null,
): PartnerDetailHeaderBadgeOptions {
  return {
    categoryName,
    approvalPreviewDraft: {
      legalCheckPassed: displayPartner.legal_check_passed,
      questionnaireFilled: displayPartner.questionnaire_filled,
      initialAssessmentDone: displayPartner.initial_assessment_done,
      hasActiveEvaluationBlock: savedPartner.has_active_evaluation_block ?? false,
    },
  };
}

function approvalTooltipTitle(approved: boolean, categoryName: string | null | undefined): string {
  if (categoryName) {
    const kind = inferPartnerCategoryKind(categoryName);
    if (kind === 'resource') {
      return approved
        ? 'Утверждён: юр. проверка пройдена, нет блокировки по оценке'
        : 'Не утверждён: нет юр. проверки или есть блокировка по оценке';
    }
    return approved
      ? 'Утверждён: юр. проверка, анкета, первичная оценка; нет блокировки по оценке'
      : 'Не утверждён: не все этапы пройдены или есть блокировка по оценке';
  }
  return approved ? 'Утверждён' : 'Не утверждён';
}

function isApprovedForBadges(partner: Partner, options?: PartnerDetailHeaderBadgeOptions): boolean {
  const draft = options?.approvalPreviewDraft;
  if (!draft) return partner.is_approved;
  return computePartnerIsApproved({
    kind: inferPartnerCategoryKind(options.categoryName),
    legalCheckPassed: draft.legalCheckPassed,
    questionnaireFilled: draft.questionnaireFilled,
    initialAssessmentDone: draft.initialAssessmentDone,
    hasActiveSupplierEvaluationBlock: draft.hasActiveEvaluationBlock,
  });
}

export function partnerDetailHeaderBadges(
  partner: Partner,
  options?: PartnerDetailHeaderBadgeOptions,
): ReactNode[] {
  const approved = isApprovedForBadges(partner, options);
  const tooltipTitle = approvalTooltipTitle(approved, options?.categoryName);

  return [
    <Tooltip key='approved' title={tooltipTitle}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          background: approved ? 'rgba(82,196,26,0.1)' : 'rgba(255,77,79,0.1)',
          color: approved ? '#52c41a' : '#ff4d4f',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        {approved ? <CheckCircleFilled style={{ fontSize: 12 }} /> : <ClockCircleFilled style={{ fontSize: 12 }} />}
        {approved ? 'Утверждён' : 'Не утверждён'}
      </div>
    </Tooltip>,
    partner.is_key_supplier && (
      <div
        key='key'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          background: 'rgba(250,173,20,0.1)',
          color: '#faad14',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <StarFilled style={{ fontSize: 12 }} />
        Ключевой
      </div>
    ),
    partner.is_targeted && (
      <div
        key='target'
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          background: 'rgba(22,119,255,0.1)',
          color: '#1677ff',
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <AimOutlined style={{ fontSize: 12 }} />
        Целевой
      </div>
    ),
  ].filter(Boolean) as ReactNode[];
}

export function partnerDetailHeaderMetaItems(
  partner: Partner,
  references: { partnerTypes?: Array<{ id: string; name: string }> } | null | undefined,
  partnerEvalKpi: PartnerSupplierEvalKpi | undefined,
  partnerEvalKpiLoading: boolean,
): ReactNode[] {
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);

  return [
    partner.inn && (
      <span key='inn' className={headerStyles.metaText}>
        <BankOutlined /> ИНН {partner.inn}
      </span>
    ),
    typeNames.length > 0 && (
      <span key='types' className={headerStyles.metaText}>
        {typeNames.join(', ')}
      </span>
    ),
    partner.actual_address && (
      <span key='addr' className={headerStyles.metaText}>
        {partner.actual_address}
      </span>
    ),
    <span key='eval-avg' className={headerStyles.metaText}>
      <SafetyCertificateOutlined />
      <span style={{ opacity: 0.9 }}>Средняя оценка:</span>{' '}
      <PartnerHeaderAvgScoreTag avgScore={partnerEvalKpi?.avgScore ?? null} loading={partnerEvalKpiLoading} />
    </span>,
    <span key='eval-next' className={headerStyles.metaText}>
      <CalendarOutlined />
      <span style={{ opacity: 0.9 }}>Следующая оценка:</span>{' '}
      {partnerEvalKpiLoading ? (
        '…'
      ) : partnerEvalKpi?.nextReevaluationIso ? (
        <PartnerNextEvalDateTags nextIso={partnerEvalKpi.nextReevaluationIso} forDarkHeader />
      ) : (
        <Tag style={{ margin: 0, verticalAlign: 'middle' }}>—</Tag>
      )}
    </span>,
  ].filter(Boolean) as ReactNode[];
}
