import { getNameById } from '../../../helpers/getNameById';
import type { ReferenceData } from '../../../api/hooks/useReferences';
import type { Partner, PartnerExportFileLink } from '../../../types/partner';
import type { RegistryExportCellValue } from '../../../components/registryExport/registryExportTypes';
import { formatEvaluationScoreDisplay } from '../evaluations/supplierEvaluationUi';
import { getPartnerListDisplayName } from '../utils/partnersListDisplayUtils';

import type { PartnerExportColumnKey } from './partnerExportColumns';

export type ReferenceDataForPartnersExport = Partial<
  Pick<
    ReferenceData,
    'partnerTypes' | 'partnerStatuses' | 'partnerCategories' | 'competencies' | 'partnerEconomicCategories'
  >
>;

export type PartnerExportRowValue = Record<PartnerExportColumnKey, RegistryExportCellValue>;

function formatExportDate(value?: string | null): string {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

function formatYesNo(value: boolean | undefined): string {
  if (value == null) return '';
  return value ? 'Да' : 'Нет';
}

function formatEvaluationRequired(value: Partner['evaluation_required']): string {
  switch (value) {
    case 'missing':
      return 'Требуется первичная оценка';
    case 'overdue':
      return 'Требуется переоценка';
    case 'none':
      return '—';
    default:
      return '';
  }
}

function formatNamesByIds(ids: string[] | undefined, items: Array<{ id: string; name: string }> | undefined): string {
  return (ids ?? [])
    .map(id => getNameById(id, items ?? []) ?? '')
    .filter(Boolean)
    .join('; ');
}

function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return formatEvaluationScoreDisplay(Number(value));
}

function formatFileLinksCell(links: PartnerExportFileLink[] | undefined): RegistryExportCellValue {
  if (!links?.length) return '';
  return { links };
}

export function mapPartnerToExportRow(
  partner: Partner,
  refs: ReferenceDataForPartnersExport,
): PartnerExportRowValue {
  const extras = partner.export_extras;

  return {
    display_name: getPartnerListDisplayName(partner),
    inn: partner.inn?.trim() || '',
    status: getNameById(partner.status_id, refs.partnerStatuses ?? []) || '',
    category: getNameById(partner.category_id, refs.partnerCategories ?? []) || '',
    types: formatNamesByIds(partner.type_ids, refs.partnerTypes),
    is_approved: formatYesNo(partner.is_approved),
    phone: partner.phone?.trim() || '',
    name: partner.name?.trim() || '',
    short_name: partner.short_name?.trim() || '',
    kpp: partner.kpp?.trim() || '',
    ogrn: partner.ogrn?.trim() || '',
    legal_address: partner.legal_address?.trim() || '',
    actual_address: partner.actual_address?.trim() || '',
    email: partner.email?.trim() || '',
    website: partner.website?.trim() || '',
    competences: formatNamesByIds(partner.competence_ids, refs.competencies),
    economic_category:
      getNameById(partner.partner_economic_category_id, refs.partnerEconomicCategories ?? []) || '',
    is_key_supplier: formatYesNo(partner.is_key_supplier),
    is_targeted: formatYesNo(partner.is_targeted),
    legal_check_passed: formatYesNo(partner.legal_check_passed),
    questionnaire_filled: formatYesNo(partner.questionnaire_filled),
    initial_assessment_done: formatYesNo(partner.initial_assessment_done),
    evaluation_required: formatEvaluationRequired(partner.evaluation_required),
    has_active_evaluation_block: formatYesNo(partner.has_active_evaluation_block),
    comment: partner.comment?.trim() || '',
    created_at: formatExportDate(partner.created_at),
    updated_at: formatExportDate(partner.updated_at),
    is_deleted: formatYesNo(partner.is_deleted),
    contacts_summary: extras?.contacts_summary ?? '',
    primary_contact_name: extras?.primary_contact_name ?? '',
    primary_contact_position: extras?.primary_contact_position ?? '',
    primary_contact_phone: extras?.primary_contact_phone ?? '',
    primary_contact_email: extras?.primary_contact_email ?? '',
    contracts_summary: extras?.contracts_summary ?? '',
    contracts_count: extras?.contracts_count != null ? String(extras.contracts_count) : '',
    legal_verification_files: formatFileLinksCell(extras?.legal_verification_file_links),
    questionnaire_files: formatFileLinksCell(extras?.questionnaire_file_links),
    partner_files: formatFileLinksCell(extras?.partner_file_links),
    avg_project_score: formatScore(extras?.avg_project_score),
    next_reevaluation_date: formatExportDate(extras?.next_reevaluation_date),
    initial_evaluation_score: formatScore(extras?.initial_evaluation_score),
    blocked_projects_count:
      extras?.blocked_projects_count != null ? String(extras.blocked_projects_count) : '',
  };
}

export function mapPartnersToExportRows(
  partners: Partner[],
  refs: ReferenceDataForPartnersExport,
  columnKeys: PartnerExportColumnKey[],
): RegistryExportCellValue[][] {
  return partners.map(partner => {
    const row = mapPartnerToExportRow(partner, refs);
    return columnKeys.map(key => row[key] ?? '');
  });
}
