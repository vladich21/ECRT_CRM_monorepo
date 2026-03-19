import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerStatuses } from '../../../database/schema';

@Injectable()
export class PartnerStatusesService {
  private readonly logger = new Logger(PartnerStatusesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение статусов партнёров (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refPartnerStatuses.id, name: refPartnerStatuses.name })
        .from(refPartnerStatuses)
        .orderBy(asc(refPartnerStatuses.name));
      return rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(refPartnerStatuses)
      .orderBy(asc(refPartnerStatuses.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(refPartnerStatuses)
      .where(eq(refPartnerStatuses.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    const insertData = { name: data.name != null ? String(data.name) : null };
    const [row] = await this.db.db.insert(refPartnerStatuses).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name;
    await this.db.db.update(refPartnerStatuses).set(updateObj).where(eq(refPartnerStatuses.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(refPartnerStatuses).where(eq(refPartnerStatuses.id, id));
    return row;
  }

  private toResponse(row: (typeof refPartnerStatuses.$inferSelect)) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
