import { describe, expect, it } from 'vitest';

import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import type { Patent } from '@/types/patent';

import { PATENT_EXPORT_COLUMNS, type PatentExportColumnKey } from './patentExportColumns';
import { mapPatentToExportRow } from './patentExportMapper';

const refs: ReferenceDataForPatents = {
  departments: [{ id: 'dept-1', name: 'Отдел патентования' }],
  users: [
    { id: 'user-1', name: 'Иванов И.И.' },
    { id: 'user-2', name: 'Петров П.П.' },
  ],
  contracts: [
    {
      id: 'contract-1',
      number: 'Д-100',
      cipher: 'ШИФР-1',
      name: 'Договор доходный',
    } as ReferenceDataForPatents['contracts'][number],
  ],
  projects: [{ id: 'project-1', name: 'Проект Альфа', code: 'PRJ-01' }],
  partners: [
    { id: 'partner-1', name: 'ООО Лицензиат', short_name: 'Лицензиат' } as ReferenceDataForPatents['partners'][number],
  ],
  patentStatuses: [{ id: 'status-1', name: 'Патент получен' }],
  patentIntellectProps: [{ id: 'ip-1', name: 'Изобретение' }],
  patentAreas: [{ id: 'area-1', name: 'Химия', code: 'A01' }],
};

const fullPatent: Patent = {
  id: 'patent-1',
  name: 'Способ получения вещества',
  registration_number: 'RU-123',
  registration_date: '2024-03-15',
  registration_number_cir: 'CIR-456',
  registration_date_cir: '2024-04-20',
  application_number: 'APP-789',
  kd_number: 'KD-001',
  department_id: 'dept-1',
  author_ids: ['user-1', 'user-2'],
  area_ids: ['area-1'],
  contract_id: 'contract-1',
  expected_licensee_partner_id: 'partner-1',
  rid_cost_excl_vat: 100000,
  rid_vat_rate: 22,
  rid_cost_vat: 22000,
  rid_cost_incl_vat: 122000,
  project_id: 'project-1',
  responsible_for_patenting_id: 'user-1',
  intellectprop_id: 'ip-1',
  status_id: 'status-1',
  is_deleted: false,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-02-01T00:00:00.000Z',
  created_by: 1,
  patent_grants_count: 2,
  patent_grants_preview: [
    { grant_number: 'GR-1', office: 'RU', grant_date: '2025-01-10', status: 'active' },
    { grant_number: 'GR-2', office: 'EA', grant_date: '2025-02-11', status: 'active' },
  ],
  requests_earliest_deadline: '2026-06-01T00:00:00.000Z',
  requests_has_response_required: true,
  transformation_target_registration_number: 'RU-999',
  transformation_source_registration_number: 'RU-111',
  transformation_notification_ic_zht: 'Увед-ИЦ',
  transformation_notification_cir: 'Увед-ЦИР',
};

describe('mapPatentToExportRow', () => {
  it('maps every export column key when patent data is present', () => {
    const row = mapPatentToExportRow(fullPatent, refs);
    const keys = PATENT_EXPORT_COLUMNS.map(column => column.key);

    expect(keys).toHaveLength(31);
    expect(Object.keys(row).sort()).toEqual([...keys].sort());

    const expected: Record<PatentExportColumnKey, string> = {
      name: 'Способ получения вещества',
      registration_number: 'RU-123',
      registration_date: '15.03.2024',
      registration_number_cir: 'CIR-456',
      registration_date_cir: '20.04.2024',
      application_number: 'APP-789',
      kd_number: 'KD-001',
      intellectprop: 'Изобретение',
      status: 'Патент получен',
      department: 'Отдел патентования',
      contract: 'Д-100',
      contract_cipher: 'ШИФР-1',
      project: 'PRJ-01 — Проект Альфа',
      project_code: 'PRJ-01',
      expected_licensee: 'Лицензиат',
      responsible: 'Иванов И.И.',
      authors: 'Иванов И.И.; Петров П.П.',
      areas: 'A01 — Химия',
      grants_count: '2',
      grants: 'GR-1 · RU · 10.01.2025; GR-2 · EA · 11.02.2025',
      rid_cost_excl_vat: '100000',
      rid_vat_rate: '22',
      rid_cost_vat: '22000',
      rid_cost_incl_vat: '122000',
      requests_earliest_deadline: '01.06.2026',
      requests_response_required: 'Да',
      transformed_into_rid: 'RU-999',
      transformed_from_rid: 'RU-111',
      transformation_notification_ic_zht: 'Увед-ИЦ',
      transformation_notification_cir: 'Увед-ЦИР',
      is_deleted: 'Нет',
    };

    for (const key of keys) {
      expect(row[key], key).toBe(expected[key]);
    }
  });

  it('returns empty strings for missing optional values', () => {
    const emptyPatent: Patent = {
      ...fullPatent,
      registration_date: '',
      contract_id: '',
      project_id: '',
      expected_licensee_partner_id: '',
      author_ids: [],
      area_ids: [],
      patent_grants_count: undefined,
      patent_grants_preview: undefined,
      rid_cost_excl_vat: null,
      rid_vat_rate: null,
      rid_cost_vat: null,
      rid_cost_incl_vat: null,
      requests_earliest_deadline: undefined,
      requests_has_response_required: undefined,
      transformation_target_registration_number: undefined,
      transformation_source_registration_number: undefined,
      transformation_notification_ic_zht: '',
      transformation_notification_cir: '',
    };

    const row = mapPatentToExportRow(emptyPatent, refs);

    expect(row.contract).toBe('');
    expect(row.expected_licensee).toBe('');
    expect(row.authors).toBe('');
    expect(row.grants).toBe('');
    expect(row.rid_cost_excl_vat).toBe('');
    expect(row.rid_vat_rate).toBe('');
    expect(row.requests_earliest_deadline).toBe('');
    expect(row.requests_response_required).toBe('');
    expect(row.transformed_into_rid).toBe('');
  });
});
