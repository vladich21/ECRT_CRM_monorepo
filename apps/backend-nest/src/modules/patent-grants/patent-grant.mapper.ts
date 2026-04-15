import { patentGrants } from '../../database/schema';

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
  created_at: string;
  updated_at: string;
  patent_name: string;
  patent_registration_number: string;
};

type PatentSnapshot = {
  name: string | null | undefined;
  registrationNumber: string | null | undefined;
};

export function mapPatentGrantToApiDto(row: PatentGrantRow, patent?: PatentSnapshot | null): PatentGrantApiDto {
  return {
    id: String(row.id),
    patent_id: row.patentId ? String(row.patentId) : '',
    grant_number: row.grantNumber ?? '',
    grant_date: row.grantDate ? String(row.grantDate) : '',
    office: row.office ?? '',
    status: row.status ?? '',
    renewal_date: row.renewalDate ? String(row.renewalDate) : '',
    notes: row.notes ?? '',
    created_at: row.createdAt ? row.createdAt.toISOString() : '',
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    patent_name: patent?.name ?? '',
    patent_registration_number: patent?.registrationNumber ?? '',
  };
}
