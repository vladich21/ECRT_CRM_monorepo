import { and, asc, eq } from 'drizzle-orm';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { DatabaseService } from '../../../database/database.service';
import { files } from '../../../database/schema';

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
  ) {
    if (!uploadedFiles?.length) return [];
    const uploadPath = this.config.get('UPLOAD_PATH') ?? './uploads';
    const basePath = path.join(uploadPath, entityType, entityId);
    fs.mkdirSync(basePath, { recursive: true });

    const baseUrl = this.config.get('FILE_UPLOAD_URL') ?? this.config.get('API_URL') ?? 'http://localhost:9001/api';
    const result: { name: string; size: string; type: string; url: string }[] = [];

    for (const file of uploadedFiles) {
      const destPath = path.join(basePath, file.originalname);
      fs.writeFileSync(destPath, file.buffer);

      const size = file.size;
      const fileType = file.mimetype || 'application/octet-stream';

      await this.upsertFile(
        entityType,
        entityId,
        file.originalname,
        fileType,
        size,
        uploadedById,
      );

      const url = `${baseUrl.replace(/\/$/, '')}/${entityType}/${entityId}/${encodeURIComponent(file.originalname)}`;
      result.push({ name: file.originalname, size: String(size), type: fileType, url });
    }

    return result;
  }

  private async upsertFile(
    entityType: string,
    tableId: string,
    name: string,
    fileType: string,
    size: number,
    uploadedById?: string,
  ) {
    const row = {
      entityType,
      tableId,
      name,
      type: fileType,
      size,
      uploadedById: uploadedById || undefined,
    };
    await this.db.db
      .insert(files)
      .values(row)
      .onConflictDoUpdate({
        target: [files.entityType, files.tableId, files.name],
        set: {
          type: fileType,
          size,
          uploadedById: uploadedById || undefined,
          updatedAt: new Date(),
        },
      });
  }

  async findByEntity(entityType: string, entityId: string) {
    const rows = await this.db.db
      .select()
      .from(files)
      .where(and(eq(files.entityType, entityType), eq(files.tableId, entityId)))
      .orderBy(asc(files.name));
    return rows.map((r) => this.toResponse(r, entityType, entityId));
  }

  async findById(fileId: string) {
    const rows = await this.db.db
      .select()
      .from(files)
      .where(eq(files.id, fileId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row, row.entityType ?? undefined, row.tableId ? String(row.tableId) : undefined);
  }

  async findOne(entityType: string, entityId: string, fileId: string) {
    const rows = await this.db.db
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
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async remove(entityType: string, entityId: string, fileId: string) {
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
    const uploadPath = this.config.get('UPLOAD_PATH') ?? './uploads';
    const filePath = path.join(uploadPath, entityType, entityId, filename);
    if (!path.resolve(filePath).startsWith(path.resolve(uploadPath))) return null;
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

  private toResponse(r: (typeof files.$inferSelect), entityType?: string, tableId?: string) {
    const baseUrl = this.config.get('FILE_UPLOAD_URL') ?? this.config.get('API_URL') ?? 'http://localhost:9001/api';
    const url = entityType && tableId && r.name
      ? `${baseUrl.replace(/\/$/, '')}/${entityType}/${tableId}/${encodeURIComponent(r.name)}`
      : `${baseUrl}/files/${r.id}`;
    return {
      id: String(r.id),
      entitytype: r.entityType ?? '',
      name: r.name ?? '',
      size: r.size != null ? String(r.size) : '',
      url,
      uploadedby_id: r.uploadedById ? String(r.uploadedById) : '',
      uploaded_at: r.uploadedAt ? r.uploadedAt.toISOString() : '',
    };
  }
}
