import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import {
  contracts,
  files,
  partnerContacts,
  supplierEvaluations,
  supplierPartnerProjectBlocks,
} from '../../../database/schema';
import { buildFileDownloadUrl } from '../../files/file-download-url';

const EVAL_SCOPE_PROJECT = 'project';
const EVAL_SCOPE_INITIAL = 'initial';

export interface PartnersExportPayload {
  data: unknown[];
  total: number;
  truncated: boolean;
}

export interface PartnerExportFileLinkPayload {
  name: string;
  url: string;
}

export interface PartnerExportExtrasPayload {
  contacts_summary: string;
  primary_contact_name: string;
  primary_contact_position: string;
  primary_contact_phone: string;
  primary_contact_email: string;
  contracts_summary: string;
  contracts_count: number;
  legal_verification_files: string;
  legal_verification_file_links: PartnerExportFileLinkPayload[];
  questionnaire_files: string;
  questionnaire_file_links: PartnerExportFileLinkPayload[];
  partner_files: string;
  partner_file_links: PartnerExportFileLinkPayload[];
  avg_project_score: number | null;
  next_reevaluation_date: string | null;
  initial_evaluation_score: number | null;
  blocked_projects_count: number;
}

@Injectable()
export class PartnerExportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async buildExportPayload(
    rows: Array<Record<string, unknown>>,
    total: number,
    fileBaseUrl: string,
  ): Promise<PartnersExportPayload> {
    const partnerIds = rows.map((row) => String(row.id ?? '')).filter(Boolean);
    const extrasByPartnerId = await this.loadPartnerExportExtrasByIds(partnerIds, fileBaseUrl);
    const data = rows.map((row) => {
      const partnerId = String(row.id ?? '');
      return {
        ...row,
        export_extras: extrasByPartnerId.get(partnerId) ?? this.emptyPartnerExportExtras(),
      };
    });
    return {
      data,
      total,
      truncated: total > data.length,
    };
  }

  private emptyPartnerExportExtras(): PartnerExportExtrasPayload {
    return {
      contacts_summary: '',
      primary_contact_name: '',
      primary_contact_position: '',
      primary_contact_phone: '',
      primary_contact_email: '',
      contracts_summary: '',
      contracts_count: 0,
      legal_verification_files: '',
      legal_verification_file_links: [],
      questionnaire_files: '',
      questionnaire_file_links: [],
      partner_files: '',
      partner_file_links: [],
      avg_project_score: null,
      next_reevaluation_date: null,
      initial_evaluation_score: null,
      blocked_projects_count: 0,
    };
  }

  private formatPartnerContactLine(contact: {
    fullName: string | null;
    position: string | null;
    phone: string | null;
    email: string | null;
  }): string {
    return [contact.fullName, contact.position, contact.phone, contact.email]
      .map((part) => (part ?? '').trim())
      .filter(Boolean)
      .join(' · ');
  }

  private formatPartnerContractLine(contract: {
    number: string | null;
    cipher: string | null;
    name: string | null;
  }): string {
    const number = (contract.number ?? '').trim();
    const cipher = (contract.cipher ?? '').trim();
    const name = (contract.name ?? '').trim();
    const head = [number, cipher].filter(Boolean).join(' / ');
    if (head && name) return `${head} - ${name}`;
    return head || name;
  }

  private formatPartnerFileLinks(
    fileRecords: Array<{ id: string; name: string }>,
    fileBaseUrl: string,
  ): PartnerExportFileLinkPayload[] {
    return fileRecords.map(file => ({
      name: file.name,
      url: buildFileDownloadUrl(this.config, file.id, { fileBaseUrl }),
    }));
  }

  private isoDateOnly(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'string') return value.length >= 10 ? value.slice(0, 10) : value;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private async loadPartnerExportExtrasByIds(
    partnerIds: string[],
    fileBaseUrl: string,
  ): Promise<Map<string, PartnerExportExtrasPayload>> {
    const map = new Map<string, PartnerExportExtrasPayload>();
    if (partnerIds.length === 0) return map;

    const [
      contactRows,
      contractRows,
      legalFileRows,
      questionnaireFileRows,
      partnerFileRows,
      evalRows,
      blockRows,
      initialEvalRows,
    ] = await Promise.all([
      this.db.db
        .select({
          partnerId: partnerContacts.partnerId,
          fullName: partnerContacts.fullName,
          position: partnerContacts.position,
          phone: partnerContacts.phone,
          email: partnerContacts.email,
          isPrimary: partnerContacts.isPrimary,
        })
        .from(partnerContacts)
        .where(inArray(partnerContacts.partnerId, partnerIds))
        .orderBy(desc(partnerContacts.isPrimary), asc(partnerContacts.fullName)),
      this.db.db
        .select({
          partnerId: contracts.partnerId,
          number: contracts.number,
          cipher: contracts.cipher,
          name: contracts.name,
        })
        .from(contracts)
        .where(and(inArray(contracts.partnerId, partnerIds), eq(contracts.isDeleted, false))!)
        .orderBy(asc(contracts.number), asc(contracts.name)),
      this.db.db
        .select({ id: files.id, tableId: files.tableId, name: files.name })
        .from(files)
        .where(and(eq(files.entityType, 'partner-legal'), inArray(files.tableId, partnerIds))!)
        .orderBy(asc(files.name)),
      this.db.db
        .select({ id: files.id, tableId: files.tableId, name: files.name })
        .from(files)
        .where(and(eq(files.entityType, 'partner-questionnaire'), inArray(files.tableId, partnerIds))!)
        .orderBy(asc(files.name)),
      this.db.db
        .select({ id: files.id, tableId: files.tableId, name: files.name })
        .from(files)
        .where(and(eq(files.entityType, 'partner'), inArray(files.tableId, partnerIds))!)
        .orderBy(asc(files.name)),
      this.db.db
        .select({
          partnerId: supplierEvaluations.partnerId,
          projectId: supplierEvaluations.projectId,
          evaluatedAt: supplierEvaluations.evaluatedAt,
          weightedScore: supplierEvaluations.weightedScore,
          nextReevaluationDate: supplierEvaluations.nextReevaluationDate,
          status: supplierEvaluations.status,
        })
        .from(supplierEvaluations)
        .where(
          and(
            inArray(supplierEvaluations.partnerId, partnerIds),
            eq(supplierEvaluations.scope, EVAL_SCOPE_PROJECT),
            inArray(supplierEvaluations.status, ['active', 'archived']),
          )!,
        ),
      this.db.db
        .select({
          partnerId: supplierPartnerProjectBlocks.partnerId,
          projectId: supplierPartnerProjectBlocks.projectId,
        })
        .from(supplierPartnerProjectBlocks)
        .where(
          and(
            inArray(supplierPartnerProjectBlocks.partnerId, partnerIds),
            eq(supplierPartnerProjectBlocks.isActive, true),
          )!,
        ),
      this.db.db
        .select({
          partnerId: supplierEvaluations.partnerId,
          weightedScore: supplierEvaluations.weightedScore,
        })
        .from(supplierEvaluations)
        .where(
          and(
            inArray(supplierEvaluations.partnerId, partnerIds),
            eq(supplierEvaluations.scope, EVAL_SCOPE_INITIAL),
            eq(supplierEvaluations.status, 'active'),
          )!,
        ),
    ]);

    const contactsByPartner = new Map<string, typeof contactRows>();
    for (const row of contactRows) {
      if (!row.partnerId) continue;
      const pid = String(row.partnerId);
      const arr = contactsByPartner.get(pid) ?? [];
      arr.push(row);
      contactsByPartner.set(pid, arr);
    }

    const contractsByPartner = new Map<string, typeof contractRows>();
    for (const row of contractRows) {
      if (!row.partnerId) continue;
      const pid = String(row.partnerId);
      const arr = contractsByPartner.get(pid) ?? [];
      arr.push(row);
      contractsByPartner.set(pid, arr);
    }

    type PartnerExportFileRecord = { id: string; name: string };
    const legalFilesByPartner = new Map<string, PartnerExportFileRecord[]>();
    for (const row of legalFileRows) {
      if (!row.tableId || !row.name || !row.id) continue;
      const pid = String(row.tableId);
      const arr = legalFilesByPartner.get(pid) ?? [];
      arr.push({ id: String(row.id), name: String(row.name) });
      legalFilesByPartner.set(pid, arr);
    }

    const questionnaireFilesByPartner = new Map<string, PartnerExportFileRecord[]>();
    for (const row of questionnaireFileRows) {
      if (!row.tableId || !row.name || !row.id) continue;
      const pid = String(row.tableId);
      const arr = questionnaireFilesByPartner.get(pid) ?? [];
      arr.push({ id: String(row.id), name: String(row.name) });
      questionnaireFilesByPartner.set(pid, arr);
    }

    const partnerFilesByPartner = new Map<string, PartnerExportFileRecord[]>();
    for (const row of partnerFileRows) {
      if (!row.tableId || !row.name || !row.id) continue;
      const pid = String(row.tableId);
      const arr = partnerFilesByPartner.get(pid) ?? [];
      arr.push({ id: String(row.id), name: String(row.name) });
      partnerFilesByPartner.set(pid, arr);
    }

    const evalsByPartner = new Map<string, typeof evalRows>();
    for (const row of evalRows) {
      if (!row.partnerId) continue;
      const pid = String(row.partnerId);
      const arr = evalsByPartner.get(pid) ?? [];
      arr.push(row);
      evalsByPartner.set(pid, arr);
    }

    const blocksByPartner = new Map<string, Set<string>>();
    for (const row of blockRows) {
      if (!row.partnerId || !row.projectId) continue;
      const pid = String(row.partnerId);
      const set = blocksByPartner.get(pid) ?? new Set<string>();
      set.add(String(row.projectId));
      blocksByPartner.set(pid, set);
    }

    const initialEvalByPartner = new Map<string, number>();
    for (const row of initialEvalRows) {
      if (!row.partnerId || row.weightedScore == null) continue;
      initialEvalByPartner.set(String(row.partnerId), Number(row.weightedScore));
    }

    for (const partnerId of partnerIds) {
      const contactList = contactsByPartner.get(partnerId) ?? [];
      const primary =
        contactList.find((contact) => contact.isPrimary) ?? contactList[0] ?? null;
      const contactsSummary = contactList
        .map((contact) =>
          this.formatPartnerContactLine({
            fullName: contact.fullName,
            position: contact.position,
            phone: contact.phone,
            email: contact.email,
          }),
        )
        .filter(Boolean)
        .join('; ');

      const partnerContracts = contractsByPartner.get(partnerId) ?? [];
      const contractsSummary = partnerContracts
        .map((contract) =>
          this.formatPartnerContractLine({
            number: contract.number,
            cipher: contract.cipher,
            name: contract.name,
          }),
        )
        .filter(Boolean)
        .join('; ');

      const partnerEvalRows = evalsByPartner.get(partnerId) ?? [];
      const activeEvalRows = partnerEvalRows.filter((row) => row.status === 'active');
      const rowsForAverage = activeEvalRows.length > 0 ? activeEvalRows : partnerEvalRows;
      const byProject = new Map<string, (typeof partnerEvalRows)[number]>();
      for (const evaluationRow of rowsForAverage) {
        const projectIdKey = String(evaluationRow.projectId);
        const prev = byProject.get(projectIdKey);
        const evAt = this.isoDateOnly(evaluationRow.evaluatedAt);
        const prevAt = prev ? this.isoDateOnly(prev.evaluatedAt) : '';
        if (!prev || evAt > prevAt) {
          byProject.set(projectIdKey, evaluationRow);
        }
      }
      const perProject = [...byProject.values()];
      let avgProjectScore: number | null = null;
      let nextReevaluationDate: string | null = null;
      if (perProject.length > 0) {
        const sum = perProject.reduce((acc, row) => acc + Number(row.weightedScore), 0);
        avgProjectScore = Math.round((sum / perProject.length) * 100) / 100;
        if (activeEvalRows.length > 0) {
          const dates = perProject
            .map((row) => (row.nextReevaluationDate ? this.isoDateOnly(row.nextReevaluationDate) : null))
            .filter((dateIso): dateIso is string => Boolean(dateIso));
          nextReevaluationDate =
            dates.length === 0 ? null : dates.reduce((earlier, later) => (earlier <= later ? earlier : later));
        }
      }

      const legalFileRecords = legalFilesByPartner.get(partnerId) ?? [];
      const questionnaireFileRecords = questionnaireFilesByPartner.get(partnerId) ?? [];
      const partnerFileRecords = partnerFilesByPartner.get(partnerId) ?? [];
      const legalFileLinks = this.formatPartnerFileLinks(legalFileRecords, fileBaseUrl);
      const questionnaireFileLinks = this.formatPartnerFileLinks(questionnaireFileRecords, fileBaseUrl);
      const partnerFileLinks = this.formatPartnerFileLinks(partnerFileRecords, fileBaseUrl);

      map.set(partnerId, {
        contacts_summary: contactsSummary,
        primary_contact_name: (primary?.fullName ?? '').trim(),
        primary_contact_position: (primary?.position ?? '').trim(),
        primary_contact_phone: (primary?.phone ?? '').trim(),
        primary_contact_email: (primary?.email ?? '').trim(),
        contracts_summary: contractsSummary,
        contracts_count: partnerContracts.length,
        legal_verification_files: legalFileRecords.map(file => file.name).join('; '),
        legal_verification_file_links: legalFileLinks,
        questionnaire_files: questionnaireFileRecords.map(file => file.name).join('; '),
        questionnaire_file_links: questionnaireFileLinks,
        partner_files: partnerFileRecords.map(file => file.name).join('; '),
        partner_file_links: partnerFileLinks,
        avg_project_score: avgProjectScore,
        next_reevaluation_date: nextReevaluationDate,
        initial_evaluation_score: initialEvalByPartner.get(partnerId) ?? null,
        blocked_projects_count: blocksByPartner.get(partnerId)?.size ?? 0,
      });
    }

    return map;
  }
}
