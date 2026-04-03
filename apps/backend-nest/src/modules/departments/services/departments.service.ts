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
    if (preview) {
      const rows = await this.db.db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .orderBy(asc(departments.name));
      return rows.map((row) => ({ id: String(row.id), name: String(row.name ?? '') }));
    }
    const rows = await this.db.db
      .select()
      .from(departments)
      .orderBy(asc(departments.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    const rows = await this.db.db
      .select()
      .from(departments)
      .where(eq(departments.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  private toResponse(row: (typeof departments.$inferSelect)) {
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      short_name: row.shortName ?? '',
      parent_id: row.parentId ? String(row.parentId) : null,
      manager_id: row.managerId ? String(row.managerId) : null,
      is_active: row.isActive ?? false,
      created_at: row.createdAt ? row.createdAt.toISOString() : null,
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }
}
