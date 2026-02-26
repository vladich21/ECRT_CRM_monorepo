import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPatentApplicationAreas } from '../../../database/schema';

@Injectable()
export class PatentApplicationAreasService {
  private readonly logger = new Logger(PatentApplicationAreasService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение областей патентных заявок');
    const rows = await this.db.db
      .select()
      .from(refPatentApplicationAreas)
      .orderBy(asc(refPatentApplicationAreas.name));
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(id: string) {
    this.logger.debug(`Получение области по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(refPatentApplicationAreas)
      .where(eq(refPatentApplicationAreas.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание области применения');
    const insertData = {
      name: data.name != null ? String(data.name) : null,
      code: data.code != null ? String(data.code) : null,
      description: data.description != null ? String(data.description) : null,
    };
    const [row] = await this.db.db
      .insert(refPatentApplicationAreas)
      .values(insertData)
      .returning();
    if (!row) return null;
    return this.toResponse(row);
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление области применения id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name;
    if (data.code !== undefined) updateObj.code = data.code;
    if (data.description !== undefined) updateObj.description = data.description;
    await this.db.db
      .update(refPatentApplicationAreas)
      .set(updateObj)
      .where(eq(refPatentApplicationAreas.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление области применения id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db
      .delete(refPatentApplicationAreas)
      .where(eq(refPatentApplicationAreas.id, id));
    return row;
  }

  private toResponse(r: (typeof refPatentApplicationAreas.$inferSelect)) {
    return {
      id: String(r.id),
      name: r.name ?? '',
      code: r.code ?? '',
      description: r.description ?? '',
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
