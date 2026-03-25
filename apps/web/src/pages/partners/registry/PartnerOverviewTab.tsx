import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import { useContracts } from '../../../api/contracts/contractApiHooks';
import type { ContractsListParams } from '../../../api/contracts/contractApi';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePartnerSupplierEvalKpi } from '../../../api/supplierEvaluations/supplierEvaluationApiHooks';
import type { Partner } from '../../../types/partner';
import {
  formatNextReevaluationKpiValue,
  isNextReevaluationInSoonWindow,
} from '../evaluations/supplierEvaluationUi';
import PartnersMainInfo from '../detailsTabs/PartnerMainInfo';
import ComplianceCards, { type ComplianceItem } from './ComplianceCards';
import DetailSidebar from './DetailSidebar';
import KpiRow from './KpiRow';
import styles from './PartnerOverviewTab.module.scss';

/** Те же фильтры списка, что у вложенной вкладки «Договоры» у партнёра (по умолчанию). */
function partnerContractsListParams(partnerId: string): ContractsListParams {
  return {
    partner_id: partnerId,
    list_tab: 'all',
    deleted_scope: 'all',
  };
}

export default function PartnerOverviewTab() {
  const partner = useOutletContext<Partner>();
  const { data: references } = useReferenceData([
    'partnerCategories',
    'partnerStatuses',
    'partnerTypes',
    'partnerEconomicCategories',
  ]);

  const contractsParams = useMemo(
    () => (partner.id ? partnerContractsListParams(partner.id) : undefined),
    [partner.id],
  );
  const { data: contractsList, isLoading: isContractsCountLoading } = useContracts(
    contractsParams,
    1,
    1,
    { enabled: Boolean(partner.id) },
  );
  const contractsTotal = contractsList?.total ?? 0;

  const { data: supplierEvalKpi } = usePartnerSupplierEvalKpi(partner.id, Boolean(partner.id));

  const complianceItems: ComplianceItem[] = [
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
  ];

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <KpiRow
          contractsCount={isContractsCountLoading ? undefined : contractsTotal}
          totalVolume='—'
          supplierEvalAvgScore={supplierEvalKpi?.avgScore ?? null}
          nextEvaluationValue={formatNextReevaluationKpiValue(supplierEvalKpi?.nextReevaluationIso ?? null)}
          nextEvaluationSoon={isNextReevaluationInSoonWindow(supplierEvalKpi?.nextReevaluationIso)}
        />
        <ComplianceCards items={complianceItems} />
        <PartnersMainInfo partner={partner} />
      </div>

      <DetailSidebar partner={partner} references={references} />
    </div>
  );
}
