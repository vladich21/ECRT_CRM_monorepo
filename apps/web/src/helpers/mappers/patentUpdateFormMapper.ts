import dayjs from 'dayjs';

import { Patent } from '../../types/patent';
import { PATENT_DEFAULT_RID_VAT_RATE } from '@/pages/patents/utils/patentRidCostUtils';
import { getEntityById } from '../getEntityById';

function numField(value: number | null | undefined, fallback: number | null = null): number | null {
  if (value == null || Number.isNaN(Number(value))) return fallback;
  return Number(value);
}

export const patentUpdateFormMapper = (
  patentData: Patent,
  referenceBooks?: {
    contracts?: Array<{ id: string; cipher: string }>;
    projects?: Array<{ id: string; code: string }>;
  },
) => {
  const values = {
    name: patentData.name || '',
    registration_number: patentData.registration_number || '',
    registration_date: patentData.registration_date ? dayjs(patentData.registration_date) : null,
    registration_number_cir: patentData.registration_number_cir || '',
    registration_date_cir: patentData.registration_date_cir ? dayjs(patentData.registration_date_cir) : null,
    application_number: patentData.application_number || '',
    department_id: patentData.department_id || null,
    author_ids: patentData.author_ids || [],
    area_ids: patentData.area_ids || [],
    project_id: patentData.project_id || null,
    contract_id: patentData.contract_id || null,
    expected_licensee_partner_id: patentData.expected_licensee_partner_id || null,
    rid_cost_excl_vat: numField(patentData.rid_cost_excl_vat),
    rid_vat_rate: numField(patentData.rid_vat_rate, PATENT_DEFAULT_RID_VAT_RATE),
    rid_cost_vat: numField(patentData.rid_cost_vat),
    rid_cost_incl_vat: numField(patentData.rid_cost_incl_vat),
    intellectprop_id: patentData.intellectprop_id || null,
    status_id: patentData.status_id || null,
    responsible_for_patenting_id: patentData.responsible_for_patenting_id || null,
    kd_number: patentData.kd_number || '',
    transformed_into_patent_id: patentData.transformed_into_patent_id || null,
    transformation_notification_ic_zht: patentData.transformation_notification_ic_zht ?? '',
    transformation_notification_cir: patentData.transformation_notification_cir ?? '',

    ...(referenceBooks && {
      contract_cipher: patentData.contract_id
        ? getEntityById(patentData.contract_id, referenceBooks.contracts)?.cipher || ''
        : '',
      project_code: patentData.project_id
        ? getEntityById(patentData.project_id, referenceBooks.projects)?.code || ''
        : '',
    }),
  };

  return values;
};
