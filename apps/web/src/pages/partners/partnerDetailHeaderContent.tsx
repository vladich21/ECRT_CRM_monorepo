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

import headerStyles from '../../components/pageLayout/DetailPageHeader.module.scss';
import type { Partner } from '../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../utils/partnerApproval';
import type { PartnerSupplierEvalKpi } from '../../utils/supplierEvaluationPartnerKpi';
import type { InitialSupplierEvaluation } from '../../types/supplierEvaluation';
import { PartnerHeaderAvgScoreTag, PartnerNextEvalDateTags } from './evaluations/partnerEvalKpiDisplay';
import chipStyles from './partnerDetailHeaderContent.module.scss';

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
  if (!categoryName) {
    return approved ? 'Утверждён' : 'Не утверждён';
  }
  const kind = inferPartnerCategoryKind(categoryName);
  if (kind === 'resource') {
    if (approved) {
      return 'Утверждён: юр. проверка пройдена, нет блокировки по оценке';
    }
    return 'Не утверждён: нет юр. проверки или есть блокировка по оценке';
  }
  if (approved) {
    return 'Утверждён: юр. проверка, анкета, первичная оценка; нет блокировки по оценке';
  }
  return 'Не утверждён: не все этапы пройдены или есть блокировка по оценке';
}

function isApprovedForBadges(partner: Partner, options?: PartnerDetailHeaderBadgeOptions): boolean {
  const draft = options?.approvalPreviewDraft;
  if (!draft) {
    return computePartnerIsApproved({
      kind: inferPartnerCategoryKind(options?.categoryName),
      legalCheckPassed: partner.legal_check_passed,
      questionnaireFilled: partner.questionnaire_filled,
      initialAssessmentDone: partner.initial_assessment_done,
      hasActiveSupplierEvaluationBlock: partner.has_active_evaluation_block ?? false,
    });
  }
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

  const approvalChip = approved ? (
    <div className={chipStyles.chipApproved}>
      <CheckCircleFilled className={chipStyles.chipIcon} />
      Утверждён
    </div>
  ) : (
    <div className={chipStyles.chipNotApproved}>
      <ClockCircleFilled className={chipStyles.chipIcon} />
      Не утверждён
    </div>
  );

  const badges: ReactNode[] = [
    <Tooltip key='approved' title={tooltipTitle}>
      {approvalChip}
    </Tooltip>,
  ];

  if (partner.is_key_supplier) {
    badges.push(
      <div key='key' className={chipStyles.chipKey}>
        <StarFilled className={chipStyles.chipIcon} />
        Ключевой
      </div>,
    );
  }

  if (partner.is_targeted) {
    badges.push(
      <div key='target' className={chipStyles.chipTarget}>
        <AimOutlined className={chipStyles.chipIcon} />
        Целевой
      </div>,
    );
  }

  return badges;
}

export function partnerDetailHeaderMetaItems(
  partner: Partner,
  references: { partnerTypes?: Array<{ id: string; name: string }> } | null | undefined,
  partnerEvalKpi: PartnerSupplierEvalKpi | undefined,
  partnerEvalKpiLoading: boolean,
  initialEval?: InitialSupplierEvaluation | null,
  initialEvalLoading?: boolean,
): ReactNode[] {
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);

  const items: ReactNode[] = [];

  if (partner.inn) {
    items.push(
      <span key='inn' className={headerStyles.metaText}>
        <BankOutlined /> ИНН {partner.inn}
      </span>,
    );
  }

  if (typeNames.length > 0) {
    items.push(
      <span key='types' className={headerStyles.metaText}>
        {typeNames.join(', ')}
      </span>,
    );
  }

  if (partner.actual_address) {
    items.push(
      <span key='addr' className={headerStyles.metaText}>
        {partner.actual_address}
      </span>,
    );
  }

  const hasProjectAvg = partnerEvalKpi?.avgScore != null;
  const hasInitialAvg = !hasProjectAvg && initialEval?.weighted_score != null;
  const avgScoreLabel = hasProjectAvg ? 'По проектам:' : hasInitialAvg ? 'Первичная оценка:' : 'Средняя оценка:';

  items.push(
    <span key='eval-avg' className={headerStyles.metaText}>
      <SafetyCertificateOutlined />
      <span className={chipStyles.metaLabel}>{avgScoreLabel}</span>{' '}
      <PartnerHeaderAvgScoreTag
        avgScore={partnerEvalKpi?.avgScore ?? (initialEval?.weighted_score ?? null)}
        loading={partnerEvalKpiLoading || (partnerEvalKpi?.avgScore == null && Boolean(initialEvalLoading))}
        forDarkHeader
      />
    </span>,
  );

  items.push(
    <span key='eval-next' className={headerStyles.metaText}>
      <CalendarOutlined />
      <span className={chipStyles.metaLabel}>Следующая оценка:</span>{' '}
      {partnerEvalKpiLoading || (partnerEvalKpi?.avgScore == null && initialEvalLoading) ? (
        '…'
      ) : partnerEvalKpi?.nextReevaluationIso ? (
        <PartnerNextEvalDateTags nextIso={partnerEvalKpi.nextReevaluationIso} forDarkHeader />
      ) : initialEval?.next_reevaluation_date ? (
        <PartnerNextEvalDateTags nextIso={initialEval.next_reevaluation_date} forDarkHeader />
      ) : (
        <Tag bordered className={chipStyles.metaPlaceholderTag}>
          —
        </Tag>
      )}
    </span>,
  );

  return items;
}
