import type { SQL } from 'drizzle-orm';
import { and, asc, count, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import {
  files,
  patents,
  relPatentsApplicationAreas,
  relPatentsExpectedLicensees,
  patentGrants,
  relPatentAuthors,
} from '../../../database/schema';
import { mapPatentGrantToApiDto } from '../../patent-grants/patent-grant.mapper';
import {
  loadExpectedLicenseePartnerIdsByGrantIds,
  syncExpectedLicenseePartners,
} from '../../patent-grants/patent-grant-expected-licensees';
import {
  loadExpectedLicenseePartnerIdsByPatentIds,
  parseExpectedLicenseePartnerIds,
  syncExpectedLicenseePartnersForPatent,
} from '../patent-expected-licensees';
import { PaginationParams } from '../../../common/pagination';
import { type DeletedScope, sqlPartsForDeletedScope } from '../../../common/deleted-scope';
import { syncPatentAutoStatus } from './patent-auto-status';
import {
  appendPatentRegistryFilterParts,
  type PatentRegistryFilterParams,
} from '../patent-registry-filter-parts';
import { type PatentGrantRegionKey } from '../patent-grant-region-filter';
import type { PatentExportParams } from '../patent-list-query.parser';
import { buildFileDownloadUrl } from '../../files/file-download-url';
import { getFileBaseUrl } from '../../files/files-config';

export type PatentListSortBy =
  | 'registration_number'
  | 'registration_date'
  | 'registration_date_cir'
  | 'created_at'
  | 'patent_status';

export interface PatentFindAllParams {
  preview: boolean;
  deletedScope: DeletedScope;
  pagination: PaginationParams;
  search?: string;
  departmentId?: string;
  statusId?: string;
  authorIds: string[];
  areaIds: string[];
  responsibleForPatentingId?: string;
  registrationYears?: number[];
  registrationCirYears?: number[];
  projectId?: string;
  contractId?: string;
  grantRegionKeys?: PatentGrantRegionKey[];
  sortBy?: PatentListSortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface PatentsListPayload {
  data: unknown[];
  total: number;
  tab_counts: { active: number; deleted: number; all: number };
}

export interface PatentsExportPayload {
  data: unknown[];
  total: number;
  truncated: boolean;
}

export interface PatentExportFileLinkPayload {
  name: string;
  url: string;
}

export type PatentExportFileSectionKey =
  | 'application'
  | 'consent'
  | 'notification'
  | 'requests'
  | 'decision_positive'
  | 'decision_negative';

export interface PatentExportExtrasPayload {
  application_files: string;
  application_file_links: PatentExportFileLinkPayload[];
  consent_files: string;
  consent_file_links: PatentExportFileLinkPayload[];
  notification_files: string;
  notification_file_links: PatentExportFileLinkPayload[];
  requests_files: string;
  requests_file_links: PatentExportFileLinkPayload[];
  decision_positive_files: string;
  decision_positive_file_links: PatentExportFileLinkPayload[];
  decision_negative_files: string;
  decision_negative_file_links: PatentExportFileLinkPayload[];
}

const PATENT_EXPORT_FILE_SECTIONS = new Set<PatentExportFileSectionKey>([
  'application',
  'consent',
  'notification',
  'requests',
  'decision_positive',
  'decision_negative',
]);

const PATENT_LIST_GRANT_PREVIEW_LIMIT = 4;
const PATENT_EXPORT_MAX_ROWS = 10_000;

type PatentGrantListPreviewForApi = {
  count: number;
  preview: Array<{
    grant_number: string;
    grant_date: string;
    office: string;
    status: string;
  }>;
};

@Injectable()
export class PatentsService {
  private readonly logger = new Logger(PatentsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  private async patentExists(patentId: string): Promise<boolean> {
    const rows = await this.db.db
      .select({ id: patents.id })
      .from(patents)
      .where(eq(patents.id, patentId))
      .limit(1);
    return Boolean(rows[0]);
  }

  async findLinkedContractIds(deletedScope: DeletedScope): Promise<string[]> {
    const scopeParts = sqlPartsForDeletedScope(patents.isDeleted, deletedScope);
    const whereClause =
      scopeParts.length > 0
        ? and(isNotNull(patents.contractId), ...scopeParts)!
        : isNotNull(patents.contractId);
    const rows = await this.db.db
      .selectDistinct({ contractId: patents.contractId })
      .from(patents)
      .where(whereClause);
    return rows
      .map((row) => (row.contractId ? String(row.contractId) : ''))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(patents)
      .where(eq(patents.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const [areaIds, authorIds, expectedByPatentId] = await Promise.all([
      this.getAreaIdsForPatent(id),
      this.getAuthorIdsForPatent(id),
      loadExpectedLicenseePartnerIdsByPatentIds(this.db, [id]),
    ]);
    const base = this.toResponse(row, areaIds, authorIds, expectedByPatentId.get(id) ?? []);
    return this.enrichPatentTransformationSnapshots(base, row);
  }

  private async getAreaIdsForPatent(patentId: string): Promise<string[]> {
    const relRows = await this.db.db
      .select({ areaId: relPatentsApplicationAreas.areaId })
      .from(relPatentsApplicationAreas)
      .where(eq(relPatentsApplicationAreas.patentId, patentId));
    return relRows.filter((relRow) => relRow.areaId != null).map((relRow) => String(relRow.areaId));
  }

  private async getAuthorIdsForPatent(patentId: string): Promise<string[]> {
    try {
      const relRows = await this.db.db
        .select({ userId: relPatentAuthors.userId })
        .from(relPatentAuthors)
        .where(eq(relPatentAuthors.patentId, patentId));
      return relRows.filter((relRow) => relRow.userId != null).map((relRow) => String(relRow.userId));
    } catch {
      return [];
    }
  }

  private async getAreaIdsMap(patentIds: string[]): Promise<Record<string, string[]>> {
    if (patentIds.length === 0) return {};
    const relRows = await this.db.db
      .select()
      .from(relPatentsApplicationAreas)
      .where(inArray(relPatentsApplicationAreas.patentId, patentIds));
    const map: Record<string, string[]> = {};
    for (const relRow of relRows) {
      if (relRow.patentId) {
        const pid = String(relRow.patentId);
        if (!map[pid]) map[pid] = [];
        if (relRow.areaId) map[pid].push(String(relRow.areaId));
      }
    }
    return map;
  }

  private async getPatentGrantsPreviewByPatentIds(
    patentIds: string[],
    previewLimit: number | null = PATENT_LIST_GRANT_PREVIEW_LIMIT,
  ): Promise<Record<string, PatentGrantListPreviewForApi>> {
    if (patentIds.length === 0) {
      return {};
    }

    const grantRowsForPage = await this.db.db
      .select()
      .from(patentGrants)
      .where(inArray(patentGrants.patentId, patentIds));

    type GrantTableRow = (typeof patentGrants.$inferSelect);
    const grantsByPatentId: Record<string, GrantTableRow[]> = {};

    for (const grantRow of grantRowsForPage) {
      if (!grantRow.patentId) {
        continue;
      }
      const patentId = String(grantRow.patentId);
      if (!grantsByPatentId[patentId]) {
        grantsByPatentId[patentId] = [];
      }
      grantsByPatentId[patentId].push(grantRow);
    }

    const previewByPatentId: Record<string, PatentGrantListPreviewForApi> = {};

    for (const patentId of patentIds) {
      const grantsForThisPatent = grantsByPatentId[patentId] ?? [];
      if (grantsForThisPatent.length === 0) {
        continue;
      }

      const sortedByGrantDateNewestFirst = [...grantsForThisPatent].sort((left, right) => {
        const leftMillis = left.grantDate ? new Date(String(left.grantDate)).getTime() : 0;
        const rightMillis = right.grantDate ? new Date(String(right.grantDate)).getTime() : 0;
        if (rightMillis !== leftMillis) {
          return rightMillis - leftMillis;
        }
        return String(right.id).localeCompare(String(left.id));
      });

      const previewItems = sortedByGrantDateNewestFirst
        .slice(0, previewLimit ?? sortedByGrantDateNewestFirst.length)
        .map((grantRow) => ({
          grant_number: grantRow.grantNumber ?? '',
          grant_date: grantRow.grantDate ? String(grantRow.grantDate) : '',
          office: grantRow.office ?? '',
          status: grantRow.status ?? '',
        }));

      previewByPatentId[patentId] = {
        count: grantsForThisPatent.length,
        preview: previewItems,
      };
    }

    return previewByPatentId;
  }

  private async getPatentRequestSummariesByPatentIds(patentIds: string[]): Promise<
    Record<
      string,
      {
        requests_earliest_deadline: string | null;
        requests_has_response_required: boolean;
      }
    >
  > {
    if (patentIds.length === 0) return {};
    const rows = await this.db.db
      .select({
        patentId: files.tableId,
        earliest: sql<string | null>`min(${files.responseDeadline})`,
        anyRequired: sql<boolean>`bool_or(coalesce(${files.responseRequired}, false))`,
      })
      .from(files)
      .where(
        and(
          eq(files.entityType, 'patent'),
          eq(files.documentSection, 'requests'),
          inArray(files.tableId, patentIds),
        )!,
      )
      .groupBy(files.tableId);

    const out: Record<
      string,
      { requests_earliest_deadline: string | null; requests_has_response_required: boolean }
    > = {};
    for (const r of rows) {
      if (!r.patentId) continue;
      const pid = String(r.patentId);
      const earliestRaw = r.earliest;
      out[pid] = {
        requests_earliest_deadline: earliestRaw ? new Date(earliestRaw).toISOString() : null,
        requests_has_response_required: Boolean(r.anyRequired),
      };
    }
    return out;
  }

  private async getAuthorIdsMap(patentIds: string[]): Promise<Record<string, string[]>> {
    if (patentIds.length === 0) return {};
    try {
      const relRows = await this.db.db
        .select()
        .from(relPatentAuthors)
        .where(inArray(relPatentAuthors.patentId, patentIds));
      const map: Record<string, string[]> = {};
      for (const relRow of relRows) {
        if (relRow.patentId) {
          const pid = String(relRow.patentId);
          if (!map[pid]) map[pid] = [];
          if (relRow.userId) map[pid].push(String(relRow.userId));
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  private buildPatentFilterParts(params: PatentRegistryFilterParams): SQL[] {
    const parts: SQL[] = [];
    appendPatentRegistryFilterParts(parts, this.db.db, params);
    return parts;
  }

  private whereForListScope(baseParts: SQL[], deletedScope: DeletedScope): SQL {
    const parts = [...baseParts, ...sqlPartsForDeletedScope(patents.isDeleted, deletedScope)];
    return parts.length > 0 ? and(...parts)! : sql`true`;
  }

  /** Режим «Получен запрос»: порядок только по ближайшему сроку из файлов раздела «Запросы», без текста статуса из справочника. */
  private patentListOrderByPatentStatus(sortOrder: 'asc' | 'desc'): SQL[] {
    const requestsEarliestDeadline = sql`(
      SELECT MIN(${files.responseDeadline})
      FROM ${files}
      WHERE ${files.entityType} = 'patent'
        AND ${files.documentSection} = 'requests'
        AND ${files.tableId} = ${patents.id}
    )`;

    const byDeadline =
      sortOrder === 'desc'
        ? sql`${requestsEarliestDeadline} DESC NULLS LAST`
        : sql`${requestsEarliestDeadline} ASC NULLS LAST`;
    return [byDeadline, desc(patents.id)];
  }

  private patentListOrderBy(sortBy: PatentListSortBy, sortOrder: 'asc' | 'desc'): SQL[] {
    const dir = sortOrder === 'desc' ? desc : asc;
    switch (sortBy) {
      case 'created_at':
        return [dir(patents.createdAt), desc(patents.id)];
      case 'registration_date':
        return [dir(patents.registrationDate), desc(patents.id)];
      case 'registration_date_cir':
        return [dir(patents.registrationDateCir), desc(patents.id)];
      case 'registration_number':
      default:
        return [dir(patents.registrationNumber), desc(patents.id)];
    }
  }

  private async countPatentsWhere(where: SQL): Promise<number> {
    const rows = await this.db.db.select({ value: count() }).from(patents).where(where);
    return Number(rows[0]?.value ?? 0);
  }

  async findAll(params: PatentFindAllParams): Promise<PatentsListPayload | unknown[]> {
    const {
      preview,
      deletedScope,
      pagination,
      search,
      departmentId,
      statusId,
      authorIds,
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
      sortBy: sortByRaw,
      sortOrder: sortOrderRaw,
    } = params;
    const { limit = 50, offset = 0 } = pagination;

    const sortBy: PatentListSortBy =
      sortByRaw === 'created_at' ||
      sortByRaw === 'registration_date' ||
      sortByRaw === 'registration_date_cir' ||
      sortByRaw === 'registration_number' ||
      sortByRaw === 'patent_status'
        ? sortByRaw
        : 'registration_number';
    const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'desc' ? 'desc' : 'asc';

    const baseParts = this.buildPatentFilterParts({
      search,
      departmentId,
      statusId,
      authorIds,
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
    });
    const listWhere = this.whereForListScope(baseParts, deletedScope);
    const listOrderBy = preview
      ? [desc(patents.createdAt), desc(patents.id)]
      : sortBy === 'patent_status'
        ? this.patentListOrderByPatentStatus(sortOrder)
        : this.patentListOrderBy(sortBy, sortOrder);

    if (preview) {
      const rows = await this.db.db
        .select({ id: patents.id, name: patents.name })
        .from(patents)
               .where(listWhere)
        .orderBy(...listOrderBy)
        .limit(limit)
        .offset(offset);
      return rows.map((row) => ({
        id: String(row.id),
        name: String(row.name ?? ''),
      }));
    }

    const whereActive = this.whereForListScope(baseParts, 'active');
    const whereDeleted = this.whereForListScope(baseParts, 'deleted');
    const whereAll = this.whereForListScope(baseParts, 'all');

    const [tabActive, tabDeleted, tabAll, rows] = await Promise.all([
      this.countPatentsWhere(whereActive),
      this.countPatentsWhere(whereDeleted),
      this.countPatentsWhere(whereAll),
      this.db.db
        .select()
        .from(patents)
        .where(listWhere)
        .orderBy(...listOrderBy)
        .limit(limit)
        .offset(offset),
    ]);

    const total =
      deletedScope === 'active' ? tabActive : deletedScope === 'deleted' ? tabDeleted : tabAll;

    const data = await this.enrichListPatentRows(rows);

    return {
      data,
      total,
      tab_counts: { active: tabActive, deleted: tabDeleted, all: tabAll },
    };
  }

  async findAllForExport(
    params: PatentExportParams,
    options?: { fileBaseUrl?: string },
  ): Promise<PatentsExportPayload> {
    const fileBaseUrl = options?.fileBaseUrl ?? getFileBaseUrl(this.config);
    const {
      deletedScope,
      search,
      departmentId,
      statusId,
      authorIds,
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
      sortBy: sortByRaw,
      sortOrder: sortOrderRaw,
    } = params;

    const sortBy: PatentListSortBy =
      sortByRaw === 'created_at' ||
      sortByRaw === 'registration_date' ||
      sortByRaw === 'registration_date_cir' ||
      sortByRaw === 'registration_number' ||
      sortByRaw === 'patent_status'
        ? sortByRaw
        : 'registration_number';
    const sortOrder: 'asc' | 'desc' = sortOrderRaw === 'desc' ? 'desc' : 'asc';

    const baseParts = this.buildPatentFilterParts({
      search,
      departmentId,
      statusId,
      authorIds,
      areaIds,
      responsibleForPatentingId,
      registrationYears,
      registrationCirYears,
      projectId,
      contractId,
      grantRegionKeys,
    });
    const listWhere = this.whereForListScope(baseParts, deletedScope);
    const listOrderBy =
      sortBy === 'patent_status'
        ? this.patentListOrderByPatentStatus(sortOrder)
        : this.patentListOrderBy(sortBy, sortOrder);

    const [total, rows] = await Promise.all([
      this.countPatentsWhere(listWhere),
      this.db.db
        .select()
        .from(patents)
        .where(listWhere)
        .orderBy(...listOrderBy)
        .limit(PATENT_EXPORT_MAX_ROWS),
    ]);

    const data = await this.enrichListPatentRows(rows, {
      includeAllGrantPreviews: true,
      includeTransformationSnapshots: true,
    });

    const patentIds = rows.map((row) => String(row.id));
    const extrasByPatentId = await this.loadPatentExportExtrasByIds(patentIds, fileBaseUrl);
    const dataWithExtras = data.map((row) => {
      const patentRow = row as Record<string, unknown>;
      const patentId = String(patentRow.id ?? '');
      return {
        ...patentRow,
        export_extras: extrasByPatentId.get(patentId) ?? this.emptyPatentExportExtras(),
      };
    });

    return {
      data: dataWithExtras,
      total,
      truncated: total > dataWithExtras.length,
    };
  }

  private emptyPatentExportExtras(): PatentExportExtrasPayload {
    return {
      application_files: '',
      application_file_links: [],
      consent_files: '',
      consent_file_links: [],
      notification_files: '',
      notification_file_links: [],
      requests_files: '',
      requests_file_links: [],
      decision_positive_files: '',
      decision_positive_file_links: [],
      decision_negative_files: '',
      decision_negative_file_links: [],
    };
  }

  private patentFileSectionForExport(documentSection: string | null | undefined): PatentExportFileSectionKey {
    if (documentSection && PATENT_EXPORT_FILE_SECTIONS.has(documentSection as PatentExportFileSectionKey)) {
      return documentSection as PatentExportFileSectionKey;
    }
    return 'application';
  }

  private formatPatentFileLinks(
    fileRecords: Array<{ id: string; name: string }>,
    fileBaseUrl: string,
  ): PatentExportFileLinkPayload[] {
    return fileRecords.map(file => ({
      name: file.name,
      url: buildFileDownloadUrl(this.config, file.id, { fileBaseUrl }),
    }));
  }

  private async loadPatentExportExtrasByIds(
    patentIds: string[],
    fileBaseUrl: string,
  ): Promise<Map<string, PatentExportExtrasPayload>> {
    const map = new Map<string, PatentExportExtrasPayload>();
    if (patentIds.length === 0) return map;

    const fileRows = await this.db.db
      .select({
        id: files.id,
        tableId: files.tableId,
        name: files.name,
        documentSection: files.documentSection,
      })
      .from(files)
      .where(and(eq(files.entityType, 'patent'), inArray(files.tableId, patentIds))!)
      .orderBy(asc(files.name));

    type PatentExportFileRecord = { id: string; name: string };
    const filesByPatentAndSection = new Map<string, Map<PatentExportFileSectionKey, PatentExportFileRecord[]>>();

    for (const row of fileRows) {
      if (!row.tableId || !row.name || !row.id) continue;
      const patentId = String(row.tableId);
      const section = this.patentFileSectionForExport(row.documentSection);
      const bySection = filesByPatentAndSection.get(patentId) ?? new Map();
      const sectionFiles = bySection.get(section) ?? [];
      sectionFiles.push({ id: String(row.id), name: row.name });
      bySection.set(section, sectionFiles);
      filesByPatentAndSection.set(patentId, bySection);
    }

    for (const patentId of patentIds) {
      const bySection = filesByPatentAndSection.get(patentId);
      const sectionRecords = (section: PatentExportFileSectionKey) => bySection?.get(section) ?? [];
      const applicationRecords = sectionRecords('application');
      const consentRecords = sectionRecords('consent');
      const notificationRecords = sectionRecords('notification');
      const requestsRecords = sectionRecords('requests');
      const decisionPositiveRecords = sectionRecords('decision_positive');
      const decisionNegativeRecords = sectionRecords('decision_negative');

      map.set(patentId, {
        application_files: applicationRecords.map(file => file.name).join('; '),
        application_file_links: this.formatPatentFileLinks(applicationRecords, fileBaseUrl),
        consent_files: consentRecords.map(file => file.name).join('; '),
        consent_file_links: this.formatPatentFileLinks(consentRecords, fileBaseUrl),
        notification_files: notificationRecords.map(file => file.name).join('; '),
        notification_file_links: this.formatPatentFileLinks(notificationRecords, fileBaseUrl),
        requests_files: requestsRecords.map(file => file.name).join('; '),
        requests_file_links: this.formatPatentFileLinks(requestsRecords, fileBaseUrl),
        decision_positive_files: decisionPositiveRecords.map(file => file.name).join('; '),
        decision_positive_file_links: this.formatPatentFileLinks(decisionPositiveRecords, fileBaseUrl),
        decision_negative_files: decisionNegativeRecords.map(file => file.name).join('; '),
        decision_negative_file_links: this.formatPatentFileLinks(decisionNegativeRecords, fileBaseUrl),
      });
    }

    return map;
  }

  private async enrichListPatentRows(
    rows: (typeof patents.$inferSelect)[],
    options?: { includeAllGrantPreviews?: boolean; includeTransformationSnapshots?: boolean },
  ): Promise<unknown[]> {
    if (rows.length === 0) {
      return [];
    }

    const patentIds = rows.map((row) => String(row.id));
    const [areaIdsMap, authorIdsMap, grantsPreviewByPatentId, requestSummaries, expectedByPatentId] =
      await Promise.all([
      this.getAreaIdsMap(patentIds),
      this.getAuthorIdsMap(patentIds),
      this.getPatentGrantsPreviewByPatentIds(
        patentIds,
        options?.includeAllGrantPreviews ? null : PATENT_LIST_GRANT_PREVIEW_LIMIT,
      ),
      this.getPatentRequestSummariesByPatentIds(patentIds),
      loadExpectedLicenseePartnerIdsByPatentIds(this.db, patentIds),
    ]);

    const data = rows.map((patentRow) => {
      const patentId = String(patentRow.id);
      const basePayload = this.toResponse(
        patentRow,
        areaIdsMap[patentId] ?? [],
        authorIdsMap[patentId] ?? [],
        expectedByPatentId.get(patentId) ?? [],
      );
      const grantListPreview = grantsPreviewByPatentId[patentId];
      const reqSum = requestSummaries[patentId];
      const withGrants =
        grantListPreview != null
          ? {
              ...basePayload,
              patent_grants_count: grantListPreview.count,
              patent_grants_preview: grantListPreview.preview,
            }
          : basePayload;
      if (reqSum != null) {
        return {
          ...withGrants,
          requests_earliest_deadline: reqSum.requests_earliest_deadline,
          requests_has_response_required: reqSum.requests_has_response_required,
        };
      }
      return withGrants;
    });

    if (!options?.includeTransformationSnapshots) {
      return data;
    }

    return this.attachTransformationSnapshots(rows, data as Record<string, unknown>[]);
  }

  private async attachTransformationSnapshots(
    rows: (typeof patents.$inferSelect)[],
    data: Record<string, unknown>[],
  ): Promise<unknown[]> {
    const linkedIds = [
      ...new Set(
        rows.flatMap((row) =>
          [
            row.transformedIntoPatentId ? String(row.transformedIntoPatentId) : '',
            row.transformedFromPatentId ? String(row.transformedFromPatentId) : '',
          ].filter(Boolean),
        ),
      ),
    ];
    if (linkedIds.length === 0) {
      return data;
    }

    const linkedRows = await this.db.db
      .select({ id: patents.id, registrationNumber: patents.registrationNumber })
      .from(patents)
      .where(inArray(patents.id, linkedIds));
    const registrationById = new Map(
      linkedRows.map((row) => [String(row.id), row.registrationNumber ?? '']),
    );

    return data.map((item, index) => {
      const sourceRow = rows[index];
      const intoId = sourceRow.transformedIntoPatentId ? String(sourceRow.transformedIntoPatentId) : '';
      const fromId = sourceRow.transformedFromPatentId ? String(sourceRow.transformedFromPatentId) : '';
      return {
        ...item,
        ...(intoId
          ? { transformation_target_registration_number: registrationById.get(intoId) ?? '' }
          : {}),
        ...(fromId
          ? { transformation_source_registration_number: registrationById.get(fromId) ?? '' }
          : {}),
      };
    });
  }

  private toResponse(
    row: (typeof patents.$inferSelect),
    areaIds: string[] = [],
    authorIds: string[] = [],
    expectedLicenseePartnerIds: string[] = [],
  ) {
    return {
      id: String(row.id),
      registration_number: row.registrationNumber ?? '',
      registration_date: row.registrationDate ? String(row.registrationDate) : '',
      registration_number_cir: row.registrationNumberCir ?? '',
      registration_date_cir: row.registrationDateCir ? String(row.registrationDateCir) : '',
      application_number: row.applicationNumber ?? '',
      name: row.name ?? '',
      department_id: String(row.departmentId ?? ''),
      contract_id: row.contractId ? String(row.contractId) : '',
      expected_licensee_partner_ids: expectedLicenseePartnerIds,
      expected_licensee_partner_id: expectedLicenseePartnerIds[0] ?? '',
      rid_cost_excl_vat:
        row.ridCostExclVat != null ? parseFloat(String(row.ridCostExclVat)) : null,
      rid_vat_rate:
        row.ridVatRate != null
          ? parseFloat(String(row.ridVatRate))
          : null,
      rid_cost_vat:
        row.ridCostVat != null ? parseFloat(String(row.ridCostVat)) : null,
      rid_cost_incl_vat:
        row.ridCostInclVat != null ? parseFloat(String(row.ridCostInclVat)) : null,
      project_id: row.projectId ? String(row.projectId) : '',
      responsible_for_patenting_id: row.responsibleForPatentId ? String(row.responsibleForPatentId) : '',
      kd_number: row.kdNumber ?? '',
      intellectprop_id: (row.intellectpropId ?? row.intellectualPropertyTypeId) ? String(row.intellectpropId ?? row.intellectualPropertyTypeId) : '',
      status_id: row.statusId ? String(row.statusId) : '',
      is_deleted: row.isDeleted ?? false,
      author_ids: authorIds,
      area_ids: areaIds,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
      created_by: row.createdBy ? String(row.createdBy) : '',
      transformed_into_patent_id: row.transformedIntoPatentId ? String(row.transformedIntoPatentId) : '',
      transformed_from_patent_id: row.transformedFromPatentId ? String(row.transformedFromPatentId) : '',
      transformation_notification_ic_zht: row.transformationNotificationIcZht ?? '',
      transformation_notification_cir: row.transformationNotificationCir ?? '',
    };
  }

  private async enrichPatentTransformationSnapshots(
    base: Record<string, unknown>,
    row: typeof patents.$inferSelect,
  ) {
    const intoId = row.transformedIntoPatentId ? String(row.transformedIntoPatentId) : '';
    const fromId = row.transformedFromPatentId ? String(row.transformedFromPatentId) : '';
    if (!intoId && !fromId) {
      return base;
    }
    const [intoRow, fromRow] = await Promise.all([
      intoId
        ? this.db.db
            .select({ registrationNumber: patents.registrationNumber })
            .from(patents)
            .where(eq(patents.id, intoId))
            .limit(1)
        : Promise.resolve([]),
      fromId
        ? this.db.db
            .select({ registrationNumber: patents.registrationNumber })
            .from(patents)
            .where(eq(patents.id, fromId))
            .limit(1)
        : Promise.resolve([]),
    ]);
    return {
      ...base,
      ...(intoId && intoRow[0]
        ? { transformation_target_registration_number: intoRow[0].registrationNumber ?? '' }
        : {}),
      ...(fromId && fromRow[0]
        ? { transformation_source_registration_number: fromRow[0].registrationNumber ?? '' }
        : {}),
    };
  }

  private async getPatentRow(id: string): Promise<(typeof patents.$inferSelect) | undefined> {
    const rows = await this.db.db.select().from(patents).where(eq(patents.id, id)).limit(1);
    return rows[0];
  }

  private async validatePatentLinkTarget(targetId: string, sourceId: string): Promise<void> {
    if (targetId === sourceId) {
      throw new BadRequestException('Нельзя связать карточку РИД с самой собой.');
    }
    const rows = await this.db.db
      .select({
        id: patents.id,
        isDeleted: patents.isDeleted,
        transformedFromPatentId: patents.transformedFromPatentId,
      })
      .from(patents)
      .where(eq(patents.id, targetId))
      .limit(1);
    const target = rows[0];
    if (!target) {
      throw new BadRequestException('Целевой РИД не найден.');
    }
    if (target.isDeleted) {
      throw new BadRequestException('Нельзя ссылаться на удаленный РИД.');
    }
    const from = target.transformedFromPatentId ? String(target.transformedFromPatentId) : '';
    if (from && from !== sourceId) {
      throw new ConflictException('Выбранный РИД уже связан как продолжение другой карточки.');
    }
  }

  async create(data: Record<string, unknown>) {
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const departmentId = toUuid(data.department_id);
    if (!departmentId) throw new BadRequestException('department_id обязателен');

    const toNum = (v: unknown): string | null => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? String(n) : null;
    };

    const insertData = {
      name: data.name != null ? String(data.name) : '',
      registrationNumber: data.registration_number != null ? String(data.registration_number) : null,
      registrationDate: toDateStr(data.registration_date),
      registrationNumberCir: data.registration_number_cir != null ? String(data.registration_number_cir) : null,
      registrationDateCir: toDateStr(data.registration_date_cir),
      applicationNumber: data.application_number != null ? String(data.application_number) : null,
      departmentId,
      contractId: toUuid(data.contract_id),
      ridCostExclVat: toNum(data.rid_cost_excl_vat),
      ridVatRate: toNum(data.rid_vat_rate) ?? String(22),
      ridCostVat: toNum(data.rid_cost_vat),
      ridCostInclVat: toNum(data.rid_cost_incl_vat),
      projectId: toUuid(data.project_id),
      kdNumber: data.kd_number != null ? String(data.kd_number) : null,
      intellectpropId: toUuid(data.intellectprop_id),
      intellectualPropertyTypeId: toUuid(data.intellectual_property_type_id),
      statusId: null,
      responsibleForPatentId: toUuid(data.responsible_for_patenting_id),
      transformedIntoPatentId: null,
      transformedFromPatentId: null,
      transformationNotificationIcZht: null,
      transformationNotificationCir: null,
    };

    const [row] = await this.db.db.insert(patents).values(insertData).returning();
    if (!row) {
      throw new BadRequestException('Не удалось создать патент');
    }
    const patentId = String(row.id);

    await this.syncAreaIds(patentId, data);
    await this.syncAuthorIds(patentId, data);
    const expectedFromBody = parseExpectedLicenseePartnerIds(data);
    if (expectedFromBody !== undefined) {
      await syncExpectedLicenseePartnersForPatent(this.db, patentId, expectedFromBody);
    }
    await syncPatentAutoStatus(this.db, patentId);
    return this.findOne(patentId);
  }

  async remove(id: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    await this.db.db
      .update(patents)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(patents.id, id));
    return this.findOne(id);
  }

  async update(id: string, data: Record<string, unknown>) {
    const currentRow = await this.getPatentRow(id);
    if (!currentRow) return null;

    const map: Record<string, string> = {
      name: 'name',
      registration_number: 'registrationNumber',
      registration_date: 'registrationDate',
      registration_number_cir: 'registrationNumberCir',
      registration_date_cir: 'registrationDateCir',
      application_number: 'applicationNumber',
      department_id: 'departmentId',
      contract_id: 'contractId',
      rid_cost_excl_vat: 'ridCostExclVat',
      rid_vat_rate: 'ridVatRate',
      rid_cost_vat: 'ridCostVat',
      rid_cost_incl_vat: 'ridCostInclVat',
      project_id: 'projectId',
      kd_number: 'kdNumber',
      intellectprop_id: 'intellectpropId',
      intellectual_property_type_id: 'intellectualPropertyTypeId',
      responsible_for_patenting_id: 'responsibleForPatentId',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) {
        const val = data[snake];
        if (
          camel === 'ridCostExclVat' ||
          camel === 'ridVatRate' ||
          camel === 'ridCostVat' ||
          camel === 'ridCostInclVat'
        ) {
          updateObj[camel] =
            val == null || val === ''
              ? null
              : Number.isFinite(Number(val))
                ? String(val)
                : null;
        } else {
          updateObj[camel] = val == null || val === '' ? null : val;
        }
      }
    }
    await this.db.db.update(patents).set(updateObj).where(eq(patents.id, id));

    await this.syncAreaIds(id, data);
    await this.syncAuthorIds(id, data);
    const expectedFromBody = parseExpectedLicenseePartnerIds(data);
    if (expectedFromBody !== undefined) {
      await syncExpectedLicenseePartnersForPatent(this.db, id, expectedFromBody);
    }
    await syncPatentAutoStatus(this.db, id);
    return this.findOne(id);
  }

  async createCopyFromRefusal(sourcePatentId: string) {
    const source = await this.getPatentRow(sourcePatentId);
    if (!source || source.isDeleted) return null;

    const hasNegativeDecision = await this.db.db
      .select({ id: files.id })
      .from(files)
      .where(
        and(
          eq(files.entityType, 'patent'),
          eq(files.tableId, sourcePatentId),
          eq(files.documentSection, 'decision_negative'),
        ),
      )
      .limit(1);
    if (!hasNegativeDecision[0]) {
      throw new BadRequestException(
        'Копию можно создать только после добавления файла в «Решение → Отрицательное».',
      );
    }

    const copyId = await this.db.db.transaction(async (tx) => {
      const [newRow] = await tx
        .insert(patents)
        .values({
          name: source.name ?? '',
          registrationNumber: null,
          registrationDate: null,
          registrationNumberCir: null,
          registrationDateCir: null,
          applicationNumber: null,
          departmentId: source.departmentId,
          contractId: source.contractId,
          ridCostExclVat: source.ridCostExclVat,
          ridVatRate: source.ridVatRate,
          ridCostVat: source.ridCostVat,
          ridCostInclVat: source.ridCostInclVat,
          projectId: source.projectId,
          kdNumber: source.kdNumber,
          intellectpropId: source.intellectpropId,
          intellectualPropertyTypeId: source.intellectualPropertyTypeId,
          statusId: null,
          responsibleForPatentId: source.responsibleForPatentId,
          transformedIntoPatentId: null,
          transformedFromPatentId: sourcePatentId,
          transformationNotificationIcZht: null,
          transformationNotificationCir: null,
        })
        .returning({ id: patents.id });
      if (!newRow?.id) {
        throw new BadRequestException('Не удалось создать копию карточки РИД.');
      }
      const newId = String(newRow.id);

      await tx
        .update(patents)
        .set({ transformedIntoPatentId: newId, updatedAt: new Date() })
        .where(eq(patents.id, sourcePatentId));

      const areaRows = await tx
        .select({ areaId: relPatentsApplicationAreas.areaId })
        .from(relPatentsApplicationAreas)
        .where(eq(relPatentsApplicationAreas.patentId, sourcePatentId));
      if (areaRows.length > 0) {
        await tx.insert(relPatentsApplicationAreas).values(
          areaRows
            .filter((row) => row.areaId != null)
            .map((row) => ({ patentId: newId, areaId: String(row.areaId) })),
        );
      }

      const authorRows = await tx
        .select({ userId: relPatentAuthors.userId })
        .from(relPatentAuthors)
        .where(eq(relPatentAuthors.patentId, sourcePatentId));
      if (authorRows.length > 0) {
        await tx.insert(relPatentAuthors).values(
          authorRows
            .filter((row) => row.userId != null)
            .map((row) => ({ patentId: newId, userId: String(row.userId) })),
        );
      }

      const expectedRows = await tx
        .select({ partnerId: relPatentsExpectedLicensees.partnerId })
        .from(relPatentsExpectedLicensees)
        .where(eq(relPatentsExpectedLicensees.patentId, sourcePatentId));
      if (expectedRows.length > 0) {
        await tx.insert(relPatentsExpectedLicensees).values(
          expectedRows
            .filter((row) => row.partnerId != null)
            .map((row) => ({ patentId: newId, partnerId: String(row.partnerId) })),
        );
      }

      return newId;
    });

    await syncPatentAutoStatus(this.db, sourcePatentId);
    await syncPatentAutoStatus(this.db, copyId);
    return this.findOne(copyId);
  }

  async restore(id: string) {
    const current = await this.findOne(id);
    if (!current) return null;
    await this.db.db
      .update(patents)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(patents.id, id));
    return this.findOne(id);
  }

  private async syncAreaIds(patentId: string, data: Record<string, unknown>) {
    const areaIds = Array.isArray(data.area_ids) ? data.area_ids.filter((x): x is string => typeof x === 'string') : [];
    await this.db.db.delete(relPatentsApplicationAreas).where(eq(relPatentsApplicationAreas.patentId, patentId));
    if (areaIds.length) {
      await this.db.db.insert(relPatentsApplicationAreas).values(
        areaIds.map((areaId) => ({ patentId, areaId })),
      );
    }
  }

  private async syncAuthorIds(patentId: string, data: Record<string, unknown>) {
    const rawIds = Array.isArray(data.author_ids) ? data.author_ids : [];
    const authorIds = rawIds
      .map((value) => (value != null && value !== '' ? String(value) : null))
      .filter((value): value is string => typeof value === 'string' && value.length > 0);
    if (authorIds.length === 0) {
      await this.db.db.delete(relPatentAuthors).where(eq(relPatentAuthors.patentId, patentId));
      return;
    }
    try {
      await this.db.db.delete(relPatentAuthors).where(eq(relPatentAuthors.patentId, patentId));
      await this.db.db.insert(relPatentAuthors).values(
        authorIds.map((userId) => ({ patentId, userId })),
      );
    } catch (err) {
      this.logger.error(
        `Не удалось сохранить авторов патента (проверьте таблицу rel_patents_users: patent_id uuid, user_id uuid): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async getGrants(patentId: string) {
    if (!(await this.patentExists(patentId))) return null;
    try {
      const rows = await this.db.db
        .select({
          grant: patentGrants,
          patentName: patents.name,
          patentRegistrationNumber: patents.registrationNumber,
        })
        .from(patentGrants)
        .innerJoin(patents, eq(patentGrants.patentId, patents.id))
        .where(eq(patentGrants.patentId, patentId))
        .orderBy(asc(patentGrants.grantDate));
      const grantIds = rows.map(({ grant }) => String(grant.id));
      const expectedByGrantId = await loadExpectedLicenseePartnerIdsByGrantIds(this.db, grantIds);
      return rows.map(({ grant: row, patentName, patentRegistrationNumber }) =>
        mapPatentGrantToApiDto(
          row,
          {
            name: patentName,
            registrationNumber: patentRegistrationNumber,
          },
          expectedByGrantId.get(String(row.id)) ?? [],
        ),
      );
    } catch {
      return [];
    }
  }

  async createGrant(patentId: string, data: Record<string, unknown>) {
    if (!(await this.patentExists(patentId))) return null;
    const expectedByPatentId = await loadExpectedLicenseePartnerIdsByPatentIds(this.db, [patentId]);
    const expectedLicenseePartnerIds = expectedByPatentId.get(patentId) ?? [];
    const insertData: Record<string, unknown> = {
      patentId,
      grantNumber: data.grant_number ?? null,
      grantDate: data.grant_date ?? null,
      office: data.office ?? null,
      status: data.status ?? null,
      renewalDate: data.renewal_date ?? null,
      notes: data.notes ?? null,
    };
    const [row] = await this.db.db.insert(patentGrants).values(insertData).returning();
    if (!row) return null;
    await syncExpectedLicenseePartners(this.db, String(row.id), expectedLicenseePartnerIds);
    const grants = await this.getGrants(patentId);
    return grants ? grants[grants.length - 1] : null;
  }
}
