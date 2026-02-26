import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { projects } from '../../../database/schema';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findOne(id: string) {
    this.logger.debug(`Получение проекта по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(data: Record<string, unknown>) {
    this.logger.debug('Создание проекта');
    const insertData = this.mapToDb(data);
    const [row] = await this.db.db.insert(projects).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление проекта id: ${id}`);
    const map: Record<string, string> = {
      code: 'code',
      name: 'name',
      short_name: 'shortName',
      description: 'description',
      start_date: 'startDate',
      end_date: 'endDate',
      manager_id: 'managerId',
      status: 'status',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) updateObj[camel] = data[snake];
    }
    await this.db.db.update(projects).set(updateObj).where(eq(projects.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление проекта id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(projects).where(eq(projects.id, id));
    return row;
  }

  private mapToDb(data: Record<string, unknown>) {
    const toDate = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const toUuid = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;

    return {
      code: data.code != null ? String(data.code) : null,
      name: data.name != null ? String(data.name) : null,
      shortName: data.short_name != null ? String(data.short_name) : null,
      description: data.description != null ? String(data.description) : null,
      startDate: toDate(data.start_date),
      endDate: toDate(data.end_date),
      managerId: toUuid(data.manager_id),
      status: data.status != null ? String(data.status) : null,
    };
  }

  async findAll(preview?: boolean) {
    this.logger.debug(`Получение проектов (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: projects.id, name: projects.name, code: projects.code })
        .from(projects)
        .orderBy(asc(projects.name));
      return rows.map((r) => ({
        id: String(r.id),
        name: String(r.name ?? ''),
        code: String(r.code ?? ''),
      }));
    }
    const rows = await this.db.db
      .select()
      .from(projects)
      .orderBy(asc(projects.name));
    return rows.map((r) => this.toResponse(r));
  }

  private toResponse(r: (typeof projects.$inferSelect)) {
    return {
      id: String(r.id),
      code: r.code ?? '',
      name: r.name ?? '',
      short_name: r.shortName ?? '',
      description: r.description ?? '',
      start_date: r.startDate ? String(r.startDate) : null,
      end_date: r.endDate ? String(r.endDate) : null,
      manager_id: r.managerId ? String(r.managerId) : null,
      status: r.status ?? '',
      created_at: r.createdAt ? r.createdAt.toISOString() : null,
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : null,
    };
  }
}
