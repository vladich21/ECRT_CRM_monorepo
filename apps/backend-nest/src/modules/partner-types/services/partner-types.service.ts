import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerTypes } from '../../../database/schema';

@Injectable()
export class PartnerTypesService {
  private readonly logger = new Logger(PartnerTypesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение типов партнёров (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refPartnerTypes.id, name: refPartnerTypes.name })
        .from(refPartnerTypes)
        .orderBy(asc(refPartnerTypes.name));
      return rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(refPartnerTypes)
      .orderBy(asc(refPartnerTypes.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(refPartnerTypes)
      .where(eq(refPartnerTypes.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    const insertData = { name: data.name != null ? String(data.name) : null };
    const [row] = await this.db.db.insert(refPartnerTypes).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name;
    await this.db.db.update(refPartnerTypes).set(updateObj).where(eq(refPartnerTypes.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(refPartnerTypes).where(eq(refPartnerTypes.id, id));
    return row;
  }

  private toResponse(row: (typeof refPartnerTypes.$inferSelect)) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
