import dayjs from 'dayjs';

import { patentRidWorkflowKind } from '@/constants/patentRidWorkflowKind';
import { getNameById } from '@/helpers/getNameById';

export type BuildPatentFormPayloadOpts = {
  patentStatuses?: Array<{ id: string; name: string }>;
};

export function buildPatentFormPayload(
  values: Record<string, unknown>,
  opts?: BuildPatentFormPayloadOpts,
): Record<string, unknown> {
  const areaIds = Array.isArray(values.area_ids)
    ? values.area_ids.map((id: unknown) => (id != null ? String(id) : '')).filter((id: string) => id && id !== 'NaN')
    : [];
  const authorIds = Array.isArray(values.author_ids)
    ? values.author_ids.filter((id: unknown) => id != null)
    : [];

  const registration_date = values.registration_date;
  const registration_date_cir = values.registration_date_cir;

  const payload: Record<string, unknown> = {
    ...values,
    registration_date: dayjs.isDayjs(registration_date) ? registration_date.format('YYYY-MM-DD') : null,
    registration_date_cir: dayjs.isDayjs(registration_date_cir) ? registration_date_cir.format('YYYY-MM-DD') : null,
    department_id: values.department_id || null,
    responsible_for_patenting_id: values.responsible_for_patenting_id || null,
    contract_id: values.contract_id || null,
    project_id: values.project_id || null,
    status_id: values.status_id || null,
    intellectprop_id: values.intellectprop_id || null,
    area_ids: areaIds,
    author_ids: authorIds,
    transformed_into_patent_id: values.transformed_into_patent_id || null,
    transformation_notification_ic_zht:
      values.transformation_notification_ic_zht != null
        ? String(values.transformation_notification_ic_zht).trim()
        : '',
    transformation_notification_cir:
      values.transformation_notification_cir != null
        ? String(values.transformation_notification_cir).trim()
        : '',
  };
  delete payload['project_code'];

  const statusName = opts?.patentStatuses
    ? getNameById(values.status_id as string | undefined, opts.patentStatuses)
    : undefined;
  if (opts?.patentStatuses && patentRidWorkflowKind(statusName) !== 'transformation') {
    delete payload.transformed_into_patent_id;
    delete payload.transformation_notification_ic_zht;
    delete payload.transformation_notification_cir;
  }

  return payload;
}
