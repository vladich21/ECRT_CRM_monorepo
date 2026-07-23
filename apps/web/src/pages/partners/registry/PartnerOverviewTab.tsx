import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePartnerContacts } from '../../../api/partners/partnerContactApiHooks';
import {
  usePartnerInitialSupplierEval,
  usePartnerSupplierEvalKpi,
} from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { Partner } from '../../../types/partner';

import { formatNextReevaluationKpiValue } from '../evaluations/supplierEvaluationUi';
import PartnersMainInfo from '../detailsTabs/PartnerMainInfo';
import DetailSidebar from './DetailSidebar';
import KpiRow from './KpiRow';
import styles from './PartnerOverviewTab.module.scss';

export default function PartnerOverviewTab() {
  const partner = useOutletContext<Partner>();
  const { data: references } = useReferenceData([
    'partnerCategories',
    'partnerStatuses',
    'partnerTypes',
    'partnerEconomicCategories',
  ]);

  const { data: supplierEvalKpi } = usePartnerSupplierEvalKpi(partner.id, Boolean(partner.id));
  const { data: initialEval } = usePartnerInitialSupplierEval(
    supplierEvalKpi?.avgScore == null ? partner.id : undefined,
  );
  const { data: partnerContacts = [] } = usePartnerContacts(partner.id);

  const complianceItems = useMemo(() => {
    const initialAssessmentDone = partner.initial_assessment_done || initialEval != null;
    const legalNote = partner.legal_check_failed
      ? 'Проверка не пройдена'
      : partner.legal_check_passed
        ? 'Пройдена'
        : 'Ожидает проверки';
    return [
      {
        label: 'Юрид. проверка',
        done: Boolean(partner.legal_check_passed) && !partner.legal_check_failed,
        note: legalNote,
      },
      {
        label: 'Первичная оценка',
        done: initialAssessmentDone,
        note: initialAssessmentDone ? 'Выполнена' : 'Не выполнена',
      },
      {
        label: 'Анкета',
        done: partner.questionnaire_filled,
        note: partner.questionnaire_filled ? 'Заполнена' : 'Не заполнена',
      },
    ];
  }, [
    partner.initial_assessment_done,
    partner.legal_check_passed,
    partner.legal_check_failed,
    partner.questionnaire_filled,
    initialEval,
  ]);

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <KpiRow
          complianceItems={complianceItems}
          supplierEvalAvgScore={supplierEvalKpi?.avgScore ?? initialEval?.weighted_score ?? null}
          nextEvaluationValue={formatNextReevaluationKpiValue(supplierEvalKpi?.nextReevaluationIso ?? null)}
          avgScoreLabel={
            supplierEvalKpi?.avgScore != null
              ? 'Оценка по проектам'
              : initialEval?.weighted_score != null
                ? 'Первичная оценка'
                : 'Средняя оценка'
          }
        />
        <PartnersMainInfo partner={partner} />
      </div>

      <DetailSidebar partner={partner} references={references} contacts={partnerContacts} />
    </div>
  );
}
