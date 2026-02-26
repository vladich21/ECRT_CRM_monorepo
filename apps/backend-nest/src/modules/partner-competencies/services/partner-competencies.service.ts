import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerCompetencies } from '../../../database/schema';

@Injectable()
export class PartnerCompetenciesService {
  private readonly logger = new Logger(PartnerCompetenciesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение компетенций партнёров (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refPartnerCompetencies.id, name: refPartnerCompetencies.name })
        .from(refPartnerCompetencies)
        .orderBy(asc(refPartnerCompetencies.name));
      return rows.map((r) => ({ id: String(r.id), name: r.name ?? '' }));
    }
    const rows = await this.db.db
      .select()
      .from(refPartnerCompetencies)
      .orderBy(asc(refPartnerCompetencies.name));
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(id: string) {
    this.logger.debug(`Получение компетенции по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(refPartnerCompetencies)
      .where(eq(refPartnerCompetencies.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание компетенции');
    const insertData = {
      name: data.name != null ? String(data.name) : null,
      colorBg: data.color_bg != null ? String(data.color_bg) : '#e0e0e0',
      colorText: data.color_text != null ? String(data.color_text) : '#000000',
      colorBorder: data.color_border != null ? String(data.color_border) : '#cccccc',
    };
    const [row] = await this.db.db.insert(refPartnerCompetencies).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление компетенции id: ${id}`);
    const map: Record<string, string> = {
      name: 'name',
      color_bg: 'colorBg',
      color_text: 'colorText',
      color_border: 'colorBorder',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }
    await this.db.db.update(refPartnerCompetencies).set(updateObj).where(eq(refPartnerCompetencies.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление компетенции id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(refPartnerCompetencies).where(eq(refPartnerCompetencies.id, id));
    return row;
  }

  private toResponse(r: (typeof refPartnerCompetencies.$inferSelect)) {
    return {
      id: String(r.id),
      name: r.name ?? '',
      color_bg: r.colorBg ?? '',
      color_text: r.colorText ?? '',
      color_border: r.colorBorder ?? '',
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
