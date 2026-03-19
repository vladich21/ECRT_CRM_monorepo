import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerCategories } from '../../../database/schema';

@Injectable()
export class PartnerCategoriesService {
  private readonly logger = new Logger(PartnerCategoriesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение категорий партнёров (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refPartnerCategories.id, name: refPartnerCategories.name })
        .from(refPartnerCategories)
        .orderBy(asc(refPartnerCategories.name));
      return rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(refPartnerCategories)
      .orderBy(asc(refPartnerCategories.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(refPartnerCategories)
      .where(eq(refPartnerCategories.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    const insertData = {
      name: data.name != null ? String(data.name) : '',
      description: data.description != null ? String(data.description) : null,
    };
    const [row] = await this.db.db.insert(refPartnerCategories).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name;
    if (data.description !== undefined) updateObj.description = data.description;
    await this.db.db.update(refPartnerCategories).set(updateObj).where(eq(refPartnerCategories.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(refPartnerCategories).where(eq(refPartnerCategories.id, id));
    return row;
  }

  private toResponse(row: (typeof refPartnerCategories.$inferSelect)) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      description: row.description ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
