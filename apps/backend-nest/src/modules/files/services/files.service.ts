import { and, desc, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../../database/database.service';
import { files } from '../../../database/schema';
import { getFileBaseUrl, getUploadPath } from '../files-config';
import type { FileResponseDto, UploadItemDto } from '../dto';

const PATENT_FILE_SECTIONS = new Set(['application', 'consent', 'notification']);
const PROJECT_DOCUMENT_SECTION_KEYS = new Set(['pm_plan', 'milestones', 'risk_matrix']);

function normalizeDocumentSection(entityType: string, raw?: string | null): string {
  if (entityType === 'patent') {
    if (raw && PATENT_FILE_SECTIONS.has(raw)) return raw;
    return 'application';
  }
  if (entityType === 'project') {
    if (raw && PROJECT_DOCUMENT_SECTION_KEYS.has(raw)) return raw;
    return 'pm_plan';
  }
  return 'default';
}

@Injectable()
export class FilesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async upload(
    uploadedFiles: Express.Multer.File[],
    entityType: string,
    entityId: string,
    uploadedById?: string,
    documentSectionRaw?: string | null,
  ): Promise<UploadItemDto[]> {
    if (!uploadedFiles?.length) return [];

    const documentSection = normalizeDocumentSection(entityType, documentSectionRaw);

    const uploadPath = getUploadPath(this.config);
    const baseUrl = getFileBaseUrl(this.config);
    const basePath = path.join(uploadPath, entityType, entityId);
    fs.mkdirSync(basePath, { recursive: true });

    const result: UploadItemDto[] = [];

    for (const file of uploadedFiles) {
      const destPath = path.join(basePath, file.originalname);
      fs.writeFileSync(destPath, file.buffer);

      const fileType = file.mimetype || 'application/octet-stream';
      await this.upsertFile(
        entityType,
        entityId,
        file.originalname,
        fileType,
        file.size,
        uploadedById,
        documentSection,
      );

      const url = `${baseUrl}/${entityType}/${entityId}/${encodeURIComponent(file.originalname)}`;
      result.push({
        name: file.originalname,
        size: String(file.size),
        type: fileType,
        url,
      });
    }

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
  ): Promise<void> {
    await this.db.db
      .insert(files)
      .values({
        entityType,
        tableId,
        name,
        documentSection,
        type: fileType,
        size,
        uploadedById: uploadedById || undefined,
      })
      .onConflictDoUpdate({
        target: [files.entityType, files.tableId, files.documentSection, files.name],
        set: {
          type: fileType,
          size,
          uploadedById: uploadedById || undefined,
          updatedAt: new Date(),
        },
      });
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
    return row;
  }

  getFilePath(entityType: string, entityId: string, filename: string): string | null {
    const uploadPath = getUploadPath(this.config);
    const filePath = path.join(uploadPath, entityType, entityId, filename);
    const resolvedRoot = path.resolve(uploadPath);
    if (!path.resolve(filePath).startsWith(resolvedRoot)) return null;
    return fs.existsSync(filePath) ? filePath : null;
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
    const baseUrl = getFileBaseUrl(this.config);
    const url =
      entityType && tableId && r.name
        ? `${baseUrl}/${entityType}/${tableId}/${encodeURIComponent(r.name)}`
        : `${baseUrl}/files/${r.id}`;

    return {
      id: String(r.id),
      entitytype: r.entityType,
      name: r.name,
      document_section: r.documentSection ?? 'default',
      size: r.size != null ? String(r.size) : null,
      url,
      uploadedby_id: r.uploadedById ? String(r.uploadedById) : null,
      uploaded_at: r.uploadedAt ? r.uploadedAt.toISOString() : null,
    };
  }
}
