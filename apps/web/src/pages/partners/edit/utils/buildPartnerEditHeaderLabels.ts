import type { ReferenceData } from '../../../../api/hooks/useReferences';
import type { Partner } from '../../../../types/partner';

export function buildPartnerEditHeaderLabels(
  displayPartner: Partner,
  partner: Partner,
  referenceBooks: Partial<Pick<ReferenceData, 'partnerCategories' | 'partnerStatuses'>>,
  categoryIdWatch?: string,
) {
  const headerTitle = (displayPartner.short_name || displayPartner.name || 'Контрагент').trim() || 'Контрагент';
  const categoryName =
    referenceBooks.partnerCategories?.find(
      c => String(c.id) === String(categoryIdWatch ?? partner.category_id),
    )?.name ?? null;
  const statusName = referenceBooks.partnerStatuses?.find(
    status => String(status.id) === String(partner.status_id),
  )?.name;
  return { headerTitle, categoryName, statusName };
}
