import type { ReactNode } from 'react';
import { AimOutlined, BankOutlined, CalendarOutlined } from '@ant-design/icons';

import headerStyles from '@/components/pageLayout/DetailPageHeader.module.scss';

type Params = {
  inn?: string | null;
  scopeLabel: string;
  periodLabel: string;
};

export function partnerEvaluationReportMetaItems({ inn, scopeLabel, periodLabel }: Params): ReactNode[] {
  const items: ReactNode[] = [];

  if (inn) {
    items.push(
      <span key='inn' className={headerStyles.metaText}>
        <BankOutlined /> ИНН {inn}
      </span>,
    );
  }

  items.push(
    <span key='scope' className={headerStyles.metaText}>
      <AimOutlined /> Охват: {scopeLabel}
    </span>,
  );

  items.push(
    <span key='period' className={headerStyles.metaText}>
      <CalendarOutlined /> Период: {periodLabel}
    </span>,
  );

  return items;
}
