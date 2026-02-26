import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { departments } from '../../../database/schema';
import { DepartmentResponseDto } from '../dto/department-response.dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean): Promise<DepartmentResponseDto[] | Record<string, unknown>[]> {
    this.logger.debug(`Получение отделов (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .orderBy(asc(departments.name));
      return rows.map((r) => ({ id: String(r.id), name: String(r.name ?? '') }));
    }
    const rows = await this.db.db
      .select()
      .from(departments)
      .orderBy(asc(departments.name));
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(id: string): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    this.logger.debug(`Получение отдела по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return this.toResponse(r);
  }

  /** Формат ответа для фронтенда (snake_case) */
  private toResponse(r: (typeof departments.$inferSelect)) {
    return {
      id: String(r.id),
      name: String(r.name ?? ''),
      short_name: r.shortName ?? '',
      parent_id: r.parentId ? String(r.parentId) : null,
      manager_id: r.managerId ? String(r.managerId) : null,
      is_active: r.isActive ?? false,
      created_at: r.createdAt ? r.createdAt.toISOString() : null,
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : null,
    };
  }
}
