import { asc, eq } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { positions } from '../../../database/schema';
import { PositionResponseDto } from '../dto/position-response.dto';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean): Promise<PositionResponseDto[] | Record<string, unknown>[]> {
    if (preview) {
      const rows = await this.db.db
        .select({ id: positions.id, name: positions.name })
        .from(positions)
        .orderBy(asc(positions.name));
      return rows.map((position) => ({ id: String(position.id), name: String(position.name ?? '') }));
    }
    const rows = await this.db.db
      .select()
      .from(positions)
      .orderBy(asc(positions.name));
    return rows.map((position) => ({
      id: String(position.id),
      name: String(position.name ?? ''),
      createdAt: position.createdAt,
      updatedAt: position.updatedAt,
    }));
  }

  async findOne(id: string): Promise<PositionResponseDto | Record<string, unknown> | null> {
    const rows = await this.db.db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async create(data: Record<string, unknown>): Promise<PositionResponseDto | Record<string, unknown> | null> {
    const insertData = {
      name: data.name != null ? String(data.name) : null,
    };
    try {
      const [row] = await this.db.db.insert(positions).values(insertData).returning();
      if (!row) return null;
      return {
        id: String(row.id),
        name: String(row.name ?? ''),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  async update(id: string, data: Record<string, unknown>): Promise<PositionResponseDto | Record<string, unknown> | null> {
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updateObj.name = data.name != null ? String(data.name) : null;
    try {
      await this.db.db.update(positions).set(updateObj).where(eq(positions.id, id));
      return this.findOne(id);
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  async remove(id: string): Promise<PositionResponseDto | Record<string, unknown> | null> {
    const row = await this.findOne(id);
    if (!row) return null;
    try {
      await this.db.db.delete(positions).where(eq(positions.id, id));
      return row;
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  private handleDbConflict(error: unknown): never {
    const dbError = (error as { cause?: { code?: string } })?.cause;
    if (dbError?.code === '23503') {
      throw new ConflictException('Невозможно удалить/изменить должность: есть связанные записи');
    }
    throw error as Error;
  }
}
