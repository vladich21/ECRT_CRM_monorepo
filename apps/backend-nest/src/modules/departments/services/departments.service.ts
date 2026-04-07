import { asc, eq } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
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

  async create(data: Record<string, unknown>): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    const insertData = {
      name: data.name != null ? String(data.name) : null,
      shortName: data.short_name != null ? String(data.short_name) : null,
      managerId: data.manager_id != null && data.manager_id !== '' ? String(data.manager_id) : null,
      parentId: data.parent_id != null && data.parent_id !== '' ? String(data.parent_id) : null,
      isActive: data.is_active !== undefined ? Boolean(data.is_active) : true,
    };
    try {
      const [row] = await this.db.db.insert(departments).values(insertData).returning();
      return row ? this.toResponse(row) : null;
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  async update(id: string, data: Record<string, unknown>): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name != null ? String(data.name) : null;
    if (data.short_name !== undefined) updateObj.shortName = data.short_name != null ? String(data.short_name) : null;
    if (data.manager_id !== undefined)
      updateObj.managerId = data.manager_id != null && data.manager_id !== '' ? String(data.manager_id) : null;
    if (data.parent_id !== undefined)
      updateObj.parentId = data.parent_id != null && data.parent_id !== '' ? String(data.parent_id) : null;
    if (data.is_active !== undefined) updateObj.isActive = Boolean(data.is_active);
    try {
      await this.db.db.update(departments).set(updateObj).where(eq(departments.id, id));
      return this.findOne(id);
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  async remove(id: string): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    const row = await this.findOne(id);
    if (!row) return null;
    try {
      await this.db.db.delete(departments).where(eq(departments.id, id));
      return row;
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  private handleDbConflict(error: unknown): never {
    const dbError = (error as { cause?: { code?: string } })?.cause;
    if (dbError?.code === '23503') {
      throw new ConflictException('Невозможно удалить/изменить отдел: есть связанные записи');
    }
    throw error as Error;
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
