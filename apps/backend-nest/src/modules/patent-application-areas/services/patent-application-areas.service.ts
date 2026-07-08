import { asc, eq } from 'drizzle-orm';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPatentApplicationAreas } from '../../../database/schema';

@Injectable()
export class PatentApplicationAreasService {
  private readonly logger = new Logger(PatentApplicationAreasService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const rows = await this.db.db
      .select()
      .from(refPatentApplicationAreas)
      .orderBy(asc(refPatentApplicationAreas.name));
    return rows.map((row) => this.toResponse(row));
  }

  async findOne(id: string) {
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
    const row = await this.findOne(id);
    if (!row) return null;
    try {
      await this.db.db
        .delete(refPatentApplicationAreas)
        .where(eq(refPatentApplicationAreas.id, id));
      return row;
    } catch (err) {
      if ((err as { cause?: { code?: string } })?.cause?.code === '23503') {
        throw new ConflictException(
          'Нельзя удалить область применения - она привязана к РИД (патентам).',
        );
      }
      throw err;
    }
  }

  private toResponse(row: (typeof refPatentApplicationAreas.$inferSelect)) {
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
