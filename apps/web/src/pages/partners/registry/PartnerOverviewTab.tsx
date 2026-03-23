import { useOutletContext } from 'react-router-dom';
import type { Partner } from '../../../types/partner';
import { useReferenceData } from '../../../api/hooks/useReferences';
import PartnersMainInfo from '../detailsTabs/PartnerMainInfo';
import KpiRow from './KpiRow';
import ComplianceCards from './ComplianceCards';
import type { ComplianceItem } from './ComplianceCards';
import DetailSidebar from './DetailSidebar';
import styles from './PartnerOverviewTab.module.scss';

export default function PartnerOverviewTab() {
  const partner = useOutletContext<Partner>();
  const { data: references } = useReferenceData([
    'partnerCategories',
    'partnerStatuses',
    'partnerTypes',
    'partnerEconomicCategories',
  ]);

  const complianceItems: ComplianceItem[] = [
    {
      label: 'Юридическая проверка',
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
          contractsCount={0}
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
