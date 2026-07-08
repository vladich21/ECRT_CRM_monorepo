import type { ReferenceData } from '../../../api/hooks/useReferences';
import type { Partner } from '../../../types/partner';

export function getPartnerListDisplayName(partner: Pick<Partner, 'short_name' | 'name'>): string {
  const shortName = partner.short_name?.trim();
  if (shortName) return shortName;
  const fullName = partner.name?.trim();
  if (fullName) return fullName;
  return '-';
}

export function toPartnerListDisplayPartner(
  partner: Partner,
  _references?: Partial<Pick<ReferenceData, 'partnerCategories'>> | null | undefined,
): Partner {
  return partner;
}
