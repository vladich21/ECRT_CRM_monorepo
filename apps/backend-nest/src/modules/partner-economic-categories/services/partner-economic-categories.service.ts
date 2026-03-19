import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerEconomicCategories } from '../../../database/schema';

@Injectable()
export class PartnerEconomicCategoriesService {
  private readonly logger = new Logger(PartnerEconomicCategoriesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение экономических категорий (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refPartnerEconomicCategories.id, name: refPartnerEconomicCategories.name })
        .from(refPartnerEconomicCategories)
        .orderBy(asc(refPartnerEconomicCategories.name));
      return rows.map((row) => ({ id: String(row.id), name: row.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(refPartnerEconomicCategories)
      .orderBy(asc(refPartnerEconomicCategories.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
    const rows = await this.db.db
      .select()
      .from(refPartnerEconomicCategories)
      .where(eq(refPartnerEconomicCategories.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    const insertData = {
      name: data.name != null ? String(data.name) : null,
      code: data.code != null ? String(data.code) : null,
      description: data.description != null ? String(data.description) : null,
    };
    const [row] = await this.db.db.insert(refPartnerEconomicCategories).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name;
    if (data.code !== undefined) updateObj.code = data.code;
    if (data.description !== undefined) updateObj.description = data.description;
    await this.db.db.update(refPartnerEconomicCategories).set(updateObj).where(eq(refPartnerEconomicCategories.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(refPartnerEconomicCategories).where(eq(refPartnerEconomicCategories.id, id));
    return row;
  }

  private toResponse(row: (typeof refPartnerEconomicCategories.$inferSelect)) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      code: row.code ?? '',
      description: row.description ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
