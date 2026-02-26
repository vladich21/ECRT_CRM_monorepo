import { and, asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import { files } from '../../../database/schema';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async findByEntity(entityType: string, entityId: string) {
    this.logger.debug(`Получение файлов для ${entityType}/${entityId}`);
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

  private toResponse(r: (typeof files.$inferSelect), entityType?: string, tableId?: string) {
    const apiUrl = this.config.get<string>('API_URL') || 'http://localhost:9001/api';
    const fileServiceUrl = this.config.get<string>('FILE_SERVICE_URL') || 'http://localhost:9003/api';
    const directFileUrl =
      entityType && tableId && r.name
        ? `${fileServiceUrl}/${entityType}/${tableId}/${encodeURIComponent(r.name)}`
        : null;
    const downloadUrl = directFileUrl ?? `${apiUrl}/files/${r.id}`;
    return {
      id: String(r.id),
      entitytype: r.entityType ?? '',
      name: r.name ?? '',
      size: r.size ?? '',
      url: downloadUrl,
      uploadedby_id: r.uploadedById ? String(r.uploadedById) : '',
      uploaded_at: r.uploadedAt ? r.uploadedAt.toISOString() : '',
    };
  }
}
