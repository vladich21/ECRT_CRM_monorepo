import { and, count, desc, eq } from 'drizzle-orm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../../database/database.service';
import { files, partners } from '../../../database/schema';
import { buildFileDownloadUrl } from '../file-download-url';
import { getUploadPath } from '../files-config';
import { resolveStoredFilePath, writeFileToIdStorage } from '../file-storage-path';
import type { FileResponseDto, UpdateFileMetaDto, UploadItemDto } from '../dto';
import { syncPatentAutoStatus } from '../../patents/services/patent-auto-status';
import { PartnersService } from '../../partners/services/partners.service';

/** entityType файла → булева колонка статуса проверки контрагента, выводимая из наличия файлов. */
const PARTNER_VERIFICATION_FLAG_BY_ENTITY_TYPE = {
  'partner-legal': 'legalCheckPassed',
  'partner-questionnaire': 'questionnaireFilled',
} as const;

type PartnerVerificationEntityType = keyof typeof PARTNER_VERIFICATION_FLAG_BY_ENTITY_TYPE;

function isPartnerVerificationEntityType(value: string): value is PartnerVerificationEntityType {
  return value in PARTNER_VERIFICATION_FLAG_BY_ENTITY_TYPE;
}

const PATENT_FILE_SECTIONS = new Set([
  'application',
  'consent',
  'notification',
  'requests',
  'decision_positive',
  'decision_negative',
]);
const PROJECT_DOCUMENT_SECTION_KEYS = new Set(['pm_plan', 'milestones', 'risk_matrix']);
const PARTNER_FILE_SECTION_KEYS = new Set([
  'default',
  'evaluation_corrective_actions',
  'evaluation_corrective_result',
]);

export type PatentRequestsUploadMeta = {
  responseRequired: boolean;
  responseDeadline: Date | null;
};

function normalizeDocumentSection(entityType: string, raw?: string | null): string {
  if (entityType === 'patent') {
    if (raw && PATENT_FILE_SECTIONS.has(raw)) return raw;
    return 'application';
  }
  if (entityType === 'project') {
    if (raw && PROJECT_DOCUMENT_SECTION_KEYS.has(raw)) return raw;
    return 'pm_plan';
  }
  if (entityType === 'partner') {
    if (raw && PARTNER_FILE_SECTION_KEYS.has(raw)) return raw;
    return 'default';
  }
  // Генерик-секция документов согласования (для любой сущности).
  if (raw === 'approval') return 'approval';
  return 'default';
}

@Injectable()
export class FilesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly partnersService: PartnersService,
  ) {}

  /**
   * Деривация статусов проверки контрагента (юрпроверка / анкета) от наличия файлов.
   *
   * ТОЛЬКО ПОВЫШЕНИЕ (upgrade-only): загрузка файла partner-legal /
   * partner-questionnaire переводит флаг в true. Авто-понижения нет: флаг = true
   * - легитимное состояние без файлов (массово выставлен импортом из ecrt/Тезиса
   * напрямую, без записей в files), его нельзя затирать удалением файла.
   * Снятие статуса - отдельным явным действием.
   */
  private async syncPartnerVerificationFlags(entityType: string, entityId: string): Promise<void> {
    if (!isPartnerVerificationEntityType(entityType)) return;
    const flagColumn = PARTNER_VERIFICATION_FLAG_BY_ENTITY_TYPE[entityType];

    const partnerRows = await this.db.db
      .select({
        legalCheckPassed: partners.legalCheckPassed,
        questionnaireFilled: partners.questionnaireFilled,
      })
      .from(partners)
      .where(eq(partners.id, entityId))
      .limit(1);
    const partnerRow = partnerRows[0];
    if (!partnerRow) return;

    // Уже true - ничего не делаем (не понижаем).
    if (Boolean(partnerRow[flagColumn] ?? false)) return;

    const [{ value: fileCount } = { value: 0 }] = await this.db.db
      .select({ value: count() })
      .from(files)
      .where(and(eq(files.entityType, entityType), eq(files.tableId, entityId)));
    if (Number(fileCount ?? 0) === 0) return;

    await this.db.db
      .update(partners)
      .set({ [flagColumn]: true, updatedAt: new Date() })
      .where(eq(partners.id, entityId));

    // Пересчитать производный операционный статус (Активный/Потенциальный) - флаг
    // влияет на «утвержден» и автодеривацию статуса инжиниринговых контрагентов.
    await this.partnersService.refreshPartnerDerivedStatus(entityId);
  }

  async upload(
    uploadedFiles: Express.Multer.File[],
    entityType: string,
    entityId: string,
    uploadedById?: string,
    documentSectionRaw?: string | null,
    requestsMeta?: PatentRequestsUploadMeta | null,
  ): Promise<UploadItemDto[]> {
    if (!uploadedFiles?.length) return [];

    const documentSection = normalizeDocumentSection(entityType, documentSectionRaw);
    const applyRequestsMeta =
      entityType === 'patent' && documentSection === 'requests' && requestsMeta != null;
    const responseRequired = applyRequestsMeta ? requestsMeta.responseRequired : false;
    const responseDeadline = applyRequestsMeta ? requestsMeta.responseDeadline : null;

    const uploadPath = getUploadPath(this.config);

    const result: UploadItemDto[] = [];

    for (const file of uploadedFiles) {
      const fileType = file.mimetype || 'application/octet-stream';
      // Сначала upsert - получаем id, затем пишем физически по непрозрачному пути id.
      const fileId = await this.upsertFile(
        entityType,
        entityId,
        file.originalname,
        fileType,
        file.size,
        uploadedById,
        documentSection,
        responseRequired,
        responseDeadline,
      );

      // Хранение по id: uploads/files/{fileId}/{originalName} - нет коллизий одноимённых
      // файлов (разные секции/версии), реальное имя сохраняется для отдачи.
      writeFileToIdStorage(uploadPath, fileId, file.originalname, file.buffer);

      result.push({
        name: file.originalname,
        size: String(file.size),
        type: fileType,
        url: buildFileDownloadUrl(this.config, fileId),
      });
    }

    if (entityType === 'patent') {
      await syncPatentAutoStatus(this.db, entityId);
    }
    await this.syncPartnerVerificationFlags(entityType, entityId);
    return result;
  }

  private async upsertFile(
    entityType: string,
    tableId: string,
    name: string,
    fileType: string,
    size: number,
    uploadedById: string | undefined,
    documentSection: string,
    responseRequired: boolean,
    responseDeadline: Date | null,
  ): Promise<string> {
    const [row] = await this.db.db
      .insert(files)
      .values({
        entityType,
        tableId,
        name,
        documentSection,
        type: fileType,
        size,
        uploadedById: uploadedById || undefined,
        responseRequired,
        responseDeadline,
      })
      .onConflictDoUpdate({
        target: [files.entityType, files.tableId, files.documentSection, files.name, files.version],
        set: {
          type: fileType,
          size,
          uploadedById: uploadedById || undefined,
          responseRequired,
          responseDeadline,
          updatedAt: new Date(),
          // Повторная загрузка того же файла снова делает его актуальным
          // (на случай конфликта с архивной строкой версионирования).
          isCurrent: true,
        },
      })
      .returning({ id: files.id });

    if (!row?.id) {
      throw new BadRequestException('Не удалось сохранить файл');
    }
    return String(row.id);
  }

  async updateMeta(
    entityType: string,
    entityId: string,
    fileId: string,
    dto: UpdateFileMetaDto,
  ): Promise<FileResponseDto | null> {
    const existing = await this.findOne(entityType, entityId, fileId);
    if (!existing) return null;
    if (entityType !== 'patent' || existing.document_section !== 'requests') {
      throw new BadRequestException(
        'Параметры запроса можно задавать только для файлов в разделе «Запросы».',
      );
    }

    const setPayload: {
      updatedAt: Date;
      responseRequired?: boolean;
      responseDeadline?: Date | null;
    } = { updatedAt: new Date() };

    if (dto.responseRequired !== undefined) {
      setPayload.responseRequired = dto.responseRequired;
    }
    if (dto.responseDeadline !== undefined) {
      if (dto.responseDeadline === null || dto.responseDeadline === '') {
        setPayload.responseDeadline = null;
      } else {
        const d = new Date(dto.responseDeadline);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException('Некорректная дата срока ответа');
        }
        setPayload.responseDeadline = d;
      }
    }

    await this.db.db
      .update(files)
      .set(setPayload)
      .where(
        and(eq(files.id, fileId), eq(files.entityType, entityType), eq(files.tableId, entityId)),
      );

    if (entityType === 'patent') {
      await syncPatentAutoStatus(this.db, entityId);
    }
    return this.findOne(entityType, entityId, fileId);
  }

  async findByEntity(entityType: string, entityId: string): Promise<FileResponseDto[]> {
    const rows = await this.db.db
      .select()
      .from(files)
      .where(and(eq(files.entityType, entityType), eq(files.tableId, entityId)))
      .orderBy(desc(files.uploadedAt));
    return rows.map((row) => this.toResponse(row, entityType, entityId));
  }

  async findById(fileId: string): Promise<FileResponseDto | null> {
    const [row] = await this.db.db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);
    if (!row) return null;
    return this.toResponse(
      row,
      row.entityType ?? undefined,
      row.tableId != null ? String(row.tableId) : undefined,
    );
  }

  async findOne(
    entityType: string,
    entityId: string,
    fileId: string,
  ): Promise<FileResponseDto | null> {
    const [row] = await this.db.db
      .select()
      .from(files)
      .where(
        and(
          eq(files.entityType, entityType),
          eq(files.tableId, entityId),
          eq(files.id, fileId),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.toResponse(row);
  }

  async remove(
    entityType: string,
    entityId: string,
    fileId: string,
  ): Promise<FileResponseDto | null> {
    const row = await this.findOne(entityType, entityId, fileId);
    if (!row) return null;
    await this.db.db
      .delete(files)
      .where(
        and(
          eq(files.entityType, entityType),
          eq(files.tableId, entityId),
          eq(files.id, fileId),
        ),
      );
    if (entityType === 'patent') {
      await syncPatentAutoStatus(this.db, entityId);
    }
    // Деривация статусов проверки - upgrade-only, удаление файла флаг не понижает.
    return row;
  }

  getFilePath(entityType: string, entityId: string, filename: string): string | null {
    const uploadPath = getUploadPath(this.config);
    const filePath = path.join(uploadPath, entityType, entityId, filename);
    const resolvedRoot = path.resolve(uploadPath);
    if (!path.resolve(filePath).startsWith(resolvedRoot)) return null;
    return fs.existsSync(filePath) ? filePath : null;
  }

  async resolvePublicFileDownload(
    fileId: string,
  ): Promise<{ filePath: string; filename: string; mimeType: string } | null> {
    const [row] = await this.db.db.select().from(files).where(eq(files.id, fileId)).limit(1);
    if (!row?.name) return null;
    const filePath = resolveStoredFilePath(getUploadPath(this.config), row);
    if (!filePath) return null;
    return {
      filePath,
      filename: row.name,
      mimeType: this.getMimeType(row.name),
    };
  }

  getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.rar': 'application/vnd.rar',
      '.rtf': 'application/rtf',
      '.odt': 'application/vnd.oasis.opendocument.text',
      '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
    };
    return mimeMap[ext] ?? 'application/octet-stream';
  }

  private toResponse(
    r: (typeof files.$inferSelect),
    entityType?: string,
    tableId?: string,
  ): FileResponseDto {
    return {
      id: String(r.id),
      entitytype: r.entityType,
      name: r.name,
      document_section: r.documentSection ?? 'default',
      size: r.size != null ? String(r.size) : null,
      url: buildFileDownloadUrl(this.config, String(r.id)),
      uploadedby_id: r.uploadedById ? String(r.uploadedById) : null,
      uploaded_at: r.uploadedAt ? r.uploadedAt.toISOString() : null,
      response_required: Boolean(r.responseRequired),
      response_deadline: r.responseDeadline ? r.responseDeadline.toISOString() : null,
      version: r.version ?? 1,
      is_current: r.isCurrent ?? true,
    };
  }
}
