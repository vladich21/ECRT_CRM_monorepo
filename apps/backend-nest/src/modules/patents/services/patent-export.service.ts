import { and, asc, eq, inArray } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import { files } from '../../../database/schema';
import { buildFileDownloadUrl } from '../../files/file-download-url';

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

@Injectable()
export class PatentExportService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async buildExportPayload(
    rows: Array<Record<string, unknown>>,
    total: number,
    fileBaseUrl: string,
  ): Promise<PatentsExportPayload> {
    const patentIds = rows.map((row) => String(row.id ?? '')).filter(Boolean);
    const extrasByPatentId = await this.loadPatentExportExtrasByIds(patentIds, fileBaseUrl);
    const data = rows.map((row) => {
      const patentId = String(row.id ?? '');
      return {
        ...row,
        export_extras: extrasByPatentId.get(patentId) ?? this.emptyPatentExportExtras(),
      };
    });
    return {
      data,
      total,
      truncated: total > data.length,
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
}
