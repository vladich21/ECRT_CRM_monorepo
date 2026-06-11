import { patentGrants } from '../../database/schema';
import type { LicenseeEntryDto } from '../licensees/licensee-entry';

export type PatentGrantRow = typeof patentGrants.$inferSelect;

export type PatentGrantApiDto = {
  id: string;
  patent_id: string;
  grant_number: string;
  grant_date: string;
  office: string;
  status: string;
  renewal_date: string;
  notes: string;
  expected_licensees: LicenseeEntryDto[];
  actual_licensees: LicenseeEntryDto[];
  /** @deprecated */
  expected_licensee_partner_ids: string[];
  /** @deprecated */
  actual_licensee_partner_ids: string[];
  /** @deprecated */
  actual_licensee_partner_id: string;
  created_at: string;
  updated_at: string;
  patent_name: string;
  patent_registration_number: string;
};

type PatentSnapshot = {
  name: string | null | undefined;
  registrationNumber: string | null | undefined;
};

function partnerIdsFromEntries(entries: LicenseeEntryDto[]): string[] {
  return entries.map(entry => entry.partner_id).filter((id): id is string => Boolean(id));
}

export function mapPatentGrantToApiDto(
  row: PatentGrantRow,
  patent?: PatentSnapshot | null,
  expectedLicensees: LicenseeEntryDto[] = [],
  actualLicensees: LicenseeEntryDto[] = [],
): PatentGrantApiDto {
  return {
    id: String(row.id),
    patent_id: row.patentId ? String(row.patentId) : '',
    grant_number: row.grantNumber ?? '',
    grant_date: row.grantDate ? String(row.grantDate) : '',
    office: row.office ?? '',
    status: row.status ?? '',
    renewal_date: row.renewalDate ? String(row.renewalDate) : '',
    notes: row.notes ?? '',
    expected_licensees: expectedLicensees,
    actual_licensees: actualLicensees,
    expected_licensee_partner_ids: partnerIdsFromEntries(expectedLicensees),
    actual_licensee_partner_ids: partnerIdsFromEntries(actualLicensees),
    actual_licensee_partner_id: partnerIdsFromEntries(actualLicensees)[0] ?? '',
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    patent_name: patent?.name ?? '',
    patent_registration_number: patent?.registrationNumber ?? '',
  };
}
