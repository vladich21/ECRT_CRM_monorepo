import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPartnerCompetencies } from '../../../database/schema';

const competenceListColumns = {
  id: refPartnerCompetencies.id,
  name: refPartnerCompetencies.name,
  createdAt: refPartnerCompetencies.createdAt,
  updatedAt: refPartnerCompetencies.updatedAt,
};

@Injectable()
export class PartnerCompetenciesService {
  private readonly logger = new Logger(PartnerCompetenciesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение компетенций партнёров');
    const rows = await this.db.db
      .select(competenceListColumns)
      .from(refPartnerCompetencies)
      .orderBy(asc(refPartnerCompetencies.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
    this.logger.debug(`Получение компетенции по id: ${id}`);
    const rows = await this.db.db
      .select(competenceListColumns)
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
    };
    const [row] = await this.db.db.insert(refPartnerCompetencies).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление компетенции id: ${id}`);
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name != null ? String(data.name) : null;
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

  private toResponse(row: {
    id: string;
    name: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }) {
    return {
      id: String(row.id),
      name: row.name ?? '',
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}
