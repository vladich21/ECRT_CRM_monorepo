import { asc, eq } from 'drizzle-orm';
import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { departments } from '../../../database/schema';
import { DepartmentResponseDto } from '../dto/department-response.dto';

@Injectable()
export class DepartmentsService {
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

  async update(id: string, data: Record<string, unknown>): Promise<DepartmentResponseDto | Record<string, unknown> | null> {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name != null ? String(data.name) : null;
    try {
      await this.db.db.update(departments).set(updateObj).where(eq(departments.id, id));
      return this.findOne(id);
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  private handleDbConflict(error: unknown): never {
    const dbError = (error as { cause?: { code?: string } })?.cause;
    if (dbError?.code === '23503') {
      throw new ConflictException('Невозможно изменить отдел: есть связанные записи');
    }
    throw error as Error;
  }

  private toResponse(row: (typeof departments.$inferSelect)) {
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      created_at: row.createdAt ? row.createdAt.toISOString() : null,
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    };
  }
}
