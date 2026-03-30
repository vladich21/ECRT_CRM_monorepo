import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePartnerContacts } from '../../../api/partners/partnerContactApiHooks';
import { usePartnerSupplierEvalKpi } from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { Partner } from '../../../types/partner';

import { mergePartnerSupplierEvalKpiWithUiMock } from '../evaluations/partnerEvaluationsUiMock';
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

  const { data: supplierEvalKpiRaw } = usePartnerSupplierEvalKpi(partner.id, Boolean(partner.id));
  const supplierEvalKpi = useMemo(
    () => mergePartnerSupplierEvalKpiWithUiMock(partner.id, supplierEvalKpiRaw),
    [partner.id, supplierEvalKpiRaw],
  );
  const { data: partnerContacts = [] } = usePartnerContacts(partner.id);

  const complianceItems = useMemo(
    () => [
      {
        label: 'Юрид. проверка',
        done: partner.legal_check_passed,
        note: partner.legal_check_passed ? 'Пройдена' : 'Не пройдена',
      },
      {
        label: 'Первичная оценка',
        done: partner.initial_assessment_done,
        note: partner.initial_assessment_done ? 'Выполнена' : 'Не выполнена',
      },
      {
        label: 'Анкета',
        done: partner.questionnaire_filled,
        note: partner.questionnaire_filled ? 'Заполнена' : 'Не заполнена',
      },
    ],
    [partner.legal_check_passed, partner.initial_assessment_done, partner.questionnaire_filled],
  );

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <KpiRow
          complianceItems={complianceItems}
          supplierEvalAvgScore={supplierEvalKpi?.avgScore ?? null}
          nextEvaluationValue={formatNextReevaluationKpiValue(supplierEvalKpi?.nextReevaluationIso ?? null)}
        />
        <PartnersMainInfo partner={partner} />
      </div>

      <DetailSidebar partner={partner} references={references} contacts={partnerContacts} />
    </div>
  );
}
