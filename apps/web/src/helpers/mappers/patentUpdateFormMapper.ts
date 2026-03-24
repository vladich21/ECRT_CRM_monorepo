import dayjs from 'dayjs';

import { Patent } from '../../types/patent';
import { getEntityById } from '../getEntityById';

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
    intellectprop_id: patentData.intellectprop_id || null,
    status_id: patentData.status_id || null,
    kd_number: patentData.kd_number || '',

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
