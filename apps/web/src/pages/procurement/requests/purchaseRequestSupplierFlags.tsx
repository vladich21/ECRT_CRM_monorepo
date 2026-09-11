import { Tag } from 'antd';

import type { PartnerEvaluationLetter, PartnerProcurementFlags } from '@/api/procurement/requests/procurementRequest.types';

const CATEGORY_COLOR: Record<PartnerEvaluationLetter, string> = {
  A: 'success',
  B: 'processing',
  C: 'warning',
  D: 'error',
};

export function EvaluationCategoryTag({ letter }: { letter: PartnerEvaluationLetter | null | undefined }) {
  if (!letter) return <Tag>Нет оценки</Tag>;
  return <Tag color={CATEGORY_COLOR[letter]}>{letter}</Tag>;
}

export function SupplierFlagTags({ flags }: { flags: PartnerProcurementFlags | null | undefined }) {
  if (!flags) return <Tag>Нет снимка</Tag>;
  return (
    <>
      <EvaluationCategoryTag letter={flags.evaluation_category} />
      {flags.blocked_on_project ? <Tag color='error'>Блок по проекту</Tag> : null}
      {!flags.is_approved ? <Tag color='warning'>Не одобрен</Tag> : null}
      {flags.reevaluation_overdue ? <Tag color='warning'>Переоценка просрочена</Tag> : null}
    </>
  );
}

export function supplierWarningText(flags: PartnerProcurementFlags | null | undefined): string | null {
  if (!flags?.warnings.length) return null;
  return flags.warnings.join('. ');
}
