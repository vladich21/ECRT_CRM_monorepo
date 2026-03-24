import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';

import { useContracts } from '../../../api/contracts/contractApiHooks';
import type { ContractsListParams } from '../../../api/contracts/contractApi';
import { useReferenceData } from '../../../api/hooks/useReferences';
import type { Partner } from '../../../types/partner';
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

  const ratingScore = partner.rating != null ? partner.rating * 20 : 0;

  return (
    <div className={styles.layout}>
      <div className={styles.leftColumn}>
        <KpiRow
          contractsCount={isContractsCountLoading ? undefined : contractsTotal}
          totalVolume='—'
          complianceScore={ratingScore}
          nextAuditDate={partner.next_audit_date || undefined}
        />
        <ComplianceCards items={complianceItems} />
        <PartnersMainInfo partner={partner} />
      </div>

      <DetailSidebar partner={partner} references={references} />
    </div>
  );
}
