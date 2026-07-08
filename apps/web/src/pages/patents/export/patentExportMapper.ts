import { formatLicenseeEntriesExport, getPatentExpectedLicensees } from '@/helpers/licenseeEntryHelpers';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import {
  calcPatentRidVatAmount,
  PATENT_DEFAULT_RID_VAT_RATE,
} from '@/pages/patents/utils/patentRidCostUtils';
import { formatPatentStatusDisplayName } from '@/pages/patents/utils/patentStatusDisplay';
import type { ReferenceDataForPatents } from '@/pages/patents/types/data';
import type { Contract } from '@/types/contract';
import type { Partner } from '@/types/partner';
import type { Patent, PatentExportFileLink } from '@/types/patent';

import type { PatentExportColumnKey } from './patentExportColumns';
import type { RegistryExportCellValue } from '../../../components/registryExport/registryExportTypes';

function formatExportDate(value?: string | null): string {
  if (!value?.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ru-RU');
}

function formatContractNumber(contract?: Contract | null): string {
  if (!contract) return '';
  return contract.number?.trim() || contract.name?.trim() || '';
}

function formatContractCipher(contract?: Contract | null): string {
  if (!contract) return '';
  return contract.cipher?.trim() || '';
}

function formatProjectExportLabel(projectId: string | undefined, refs: ReferenceDataForPatents): string {
  const project = getEntityById(projectId, refs.projects ?? []);
  return formatProjectChipLabel(project) || getNameById(projectId, refs.projects ?? []) || '';
}

function formatProjectCode(projectId: string | undefined, refs: ReferenceDataForPatents): string {
  const project = getEntityById(projectId, refs.projects ?? []);
  return project?.code?.trim() || '';
}

function formatPartnerExportLabel(partnerIds: string[] | undefined, refs: ReferenceDataForPatents): string {
  return (partnerIds ?? [])
    .map(partnerId => {
      const partner = getEntityById(partnerId, refs.partners ?? []) as Partner | undefined;
      if (!partner) return '';
      const shortName = String(partner.short_name ?? '').trim();
      const fullName = String(partner.name ?? '').trim();
      return shortName || fullName;
    })
    .filter(Boolean)
    .join('; ');
}

function formatExpectedLicenseeExport(patent: Patent, refs: ReferenceDataForPatents): string {
  const entries = getPatentExpectedLicensees(patent);
  const inline = formatLicenseeEntriesExport(entries.filter(entry => entry.name.trim() || entry.inn));
  if (inline) return inline;

  const partnerIds = entries.map(entry => entry.partner_id).filter((id): id is string => Boolean(id));
  return formatPartnerExportLabel(partnerIds, refs);
}

function formatAuthorsExportLabel(authorIds: string[] | undefined, refs: ReferenceDataForPatents): string {
  return (authorIds ?? [])
    .map(authorId => getNameById(authorId, refs.users ?? []) ?? '')
    .filter(Boolean)
    .join('; ');
}

function formatAreasExportLabel(areaIds: string[] | undefined, refs: ReferenceDataForPatents): string {
  return (areaIds ?? [])
    .map(areaId => {
      const area = getEntityById(areaId, refs.patentAreas ?? []);
      if (!area) return '';
      return area.code ? `${area.code} - ${area.name}` : area.name;
    })
    .filter(Boolean)
    .join('; ');
}

function formatGrantsExportLabel(patent: Patent): string {
  const preview = patent.patent_grants_preview ?? [];
  if (preview.length === 0) return '';
  return preview
    .map(grant => {
      const parts = [grant.grant_number?.trim(), grant.office?.trim(), formatExportDate(grant.grant_date)].filter(Boolean);
      return parts.join(' · ');
    })
    .join('; ');
}

function formatMoneyExport(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '';
  return String(Number(value));
}

function formatVatRateExport(patent: Patent): string {
  if (patent.rid_vat_rate == null) return '';
  return String(patent.rid_vat_rate);
}

function formatVatAmountExport(patent: Patent): string {
  const rate = patent.rid_vat_rate ?? PATENT_DEFAULT_RID_VAT_RATE;
  const amount =
    patent.rid_cost_vat != null && patent.rid_cost_vat > 0
      ? patent.rid_cost_vat
      : calcPatentRidVatAmount(patent.rid_cost_excl_vat, rate, patent.rid_cost_incl_vat);
  return formatMoneyExport(amount);
}

function formatYesNo(value: boolean | undefined): string {
  if (value == null) return '';
  return value ? 'Да' : 'Нет';
}

function formatFileLinksCell(links: PatentExportFileLink[] | undefined): RegistryExportCellValue {
  if (!links?.length) return '';
  return { links };
}

export function mapPatentToExportRow(
  patent: Patent,
  refs: ReferenceDataForPatents,
): Record<PatentExportColumnKey, RegistryExportCellValue> {
  const statusName = getNameById(patent.status_id, refs.patentStatuses) || '';
  const requestDeadline = patent.requests_earliest_deadline
    ? new Date(patent.requests_earliest_deadline)
    : null;
  const contract = getEntityById(patent.contract_id, refs.contracts ?? []);
  const extras = patent.export_extras;

  return {
    name: patent.name?.trim() || '',
    registration_number: patent.registration_number?.trim() || '',
    registration_date: formatExportDate(patent.registration_date),
    registration_number_cir: patent.registration_number_cir?.trim() || '',
    registration_date_cir: formatExportDate(patent.registration_date_cir),
    application_number: patent.application_number?.trim() || '',
    kd_number: patent.kd_number?.trim() || '',
    intellectprop: getNameById(patent.intellectprop_id, refs.patentIntellectProps) || '',
    status: formatPatentStatusDisplayName(
      statusName,
      requestDeadline && !Number.isNaN(requestDeadline.getTime()) ? requestDeadline : null,
    ),
    department: getNameById(patent.department_id, refs.departments) || '',
    contract: formatContractNumber(contract),
    contract_cipher: formatContractCipher(contract),
    project: formatProjectExportLabel(patent.project_id, refs),
    project_code: formatProjectCode(patent.project_id, refs),
    expected_licensee: formatExpectedLicenseeExport(patent, refs),
    responsible: getNameById(patent.responsible_for_patenting_id, refs.users ?? []) || '',
    authors: formatAuthorsExportLabel(patent.author_ids, refs),
    areas: formatAreasExportLabel(patent.area_ids, refs),
    grants_count: patent.patent_grants_count != null ? String(patent.patent_grants_count) : '',
    grants: formatGrantsExportLabel(patent),
    rid_cost_excl_vat: formatMoneyExport(patent.rid_cost_excl_vat),
    rid_vat_rate: formatVatRateExport(patent),
    rid_cost_vat: formatVatAmountExport(patent),
    rid_cost_incl_vat: formatMoneyExport(patent.rid_cost_incl_vat),
    requests_earliest_deadline: formatExportDate(patent.requests_earliest_deadline),
    requests_response_required: formatYesNo(patent.requests_has_response_required),
    transformed_into_rid: patent.transformation_target_registration_number?.trim() || '',
    transformed_from_rid: patent.transformation_source_registration_number?.trim() || '',
    transformation_notification_ic_zht: patent.transformation_notification_ic_zht?.trim() || '',
    transformation_notification_cir: patent.transformation_notification_cir?.trim() || '',
    application_files: formatFileLinksCell(extras?.application_file_links),
    consent_files: formatFileLinksCell(extras?.consent_file_links),
    notification_files: formatFileLinksCell(extras?.notification_file_links),
    requests_files: formatFileLinksCell(extras?.requests_file_links),
    decision_positive_files: formatFileLinksCell(extras?.decision_positive_file_links),
    decision_negative_files: formatFileLinksCell(extras?.decision_negative_file_links),
    is_deleted: formatYesNo(patent.is_deleted),
  };
}

export function mapPatentsToExportRows(
  patents: Patent[],
  refs: ReferenceDataForPatents,
  columnKeys: PatentExportColumnKey[],
): RegistryExportCellValue[][] {
  return patents.map(patent => {
    const row = mapPatentToExportRow(patent, refs);
    return columnKeys.map(key => row[key] ?? '');
  });
}
