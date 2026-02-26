import { eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { patentGrants } from '../../../database/schema';

@Injectable()
export class PatentGrantsService {
  private readonly logger = new Logger(PatentGrantsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findOne(id: string) {
    this.logger.debug(`Получение grant по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(patentGrants)
      .where(eq(patentGrants.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async update(id: string, data: Record<string, unknown>) {
    this.logger.debug(`Обновление grant id: ${id}`);
    const current = await this.findOne(id);
    if (!current) return null;
    const toDateStr = (v: unknown): string | null =>
      v == null || v === '' ? null : typeof v === 'string' ? v : null;
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (data.grant_number !== undefined) updateObj.grantNumber = data.grant_number;
    if (data.grant_date !== undefined) updateObj.grantDate = toDateStr(data.grant_date);
    if (data.office !== undefined) updateObj.office = data.office;
    if (data.status !== undefined) updateObj.status = data.status;
    if (data.renewal_date !== undefined) updateObj.renewalDate = toDateStr(data.renewal_date);
    if (data.notes !== undefined) updateObj.notes = data.notes;
    await this.db.db.update(patentGrants).set(updateObj).where(eq(patentGrants.id, id));
    return this.findOne(id);
  }

  async remove(id: string) {
    this.logger.debug(`Удаление grant id: ${id}`);
    const row = await this.findOne(id);
    if (!row) return null;
    await this.db.db.delete(patentGrants).where(eq(patentGrants.id, id));
    return row;
  }

  private toResponse(r: (typeof patentGrants.$inferSelect)) {
    return {
      id: String(r.id),
      patent_id: r.patentId ? String(r.patentId) : '',
      grant_number: r.grantNumber ?? '',
      grant_date: r.grantDate ? String(r.grantDate) : '',
      office: r.office ?? '',
      status: r.status ?? '',
      renewal_date: r.renewalDate ? String(r.renewalDate) : '',
      notes: r.notes ?? '',
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
