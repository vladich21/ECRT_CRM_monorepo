import { and, asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { partnerContacts } from '../../../database/schema';

@Injectable()
export class PartnerContactsService {
  private readonly logger = new Logger(PartnerContactsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(partnerId: string) {
    this.logger.debug(`Получение контактов партнёра ${partnerId}`);
    const rows = await this.db.db
      .select()
      .from(partnerContacts)
      .where(eq(partnerContacts.partnerId, partnerId))
      .orderBy(asc(partnerContacts.fullName));
    return rows.map((r) => this.toResponse(r));
  }

  async findOne(partnerId: string, contactId: string) {
    const rows = await this.db.db
      .select()
      .from(partnerContacts)
      .where(and(eq(partnerContacts.partnerId, partnerId), eq(partnerContacts.id, contactId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.toResponse(row);
  }

  async create(partnerId: string, data: Record<string, unknown>) {
    const isPrimary = data.is_primary === true || data.is_primary === 'true';
    if (isPrimary) {
      await this.db.db
        .update(partnerContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(partnerContacts.partnerId, partnerId));
    }
    const insertData = {
      partnerId,
      fullName: data.full_name != null ? String(data.full_name) : null,
      position: data.position != null ? String(data.position) : null,
      phone: data.phone != null ? String(data.phone) : null,
      email: data.email != null ? String(data.email) : null,
      isPrimary,
    };
    const [row] = await this.db.db.insert(partnerContacts).values(insertData).returning();
    return row ? this.toResponse(row) : null;
  }

  async update(partnerId: string, contactId: string, data: Record<string, unknown>) {
    const isPrimary = data.is_primary === true || data.is_primary === 'true';
    if (isPrimary) {
      await this.db.db
        .update(partnerContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(partnerContacts.partnerId, partnerId));
    }
    const map: Record<string, string> = {
      full_name: 'fullName',
      position: 'position',
      phone: 'phone',
      email: 'email',
      is_primary: 'isPrimary',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) {
        if (snake === 'is_primary') updateObj[camel] = isPrimary;
        else updateObj[camel] = data[snake];
      }
    }
    await this.db.db
      .update(partnerContacts)
      .set(updateObj)
      .where(and(eq(partnerContacts.partnerId, partnerId), eq(partnerContacts.id, contactId)));
    return this.findOne(partnerId, contactId);
  }

  async remove(partnerId: string, contactId: string) {
    const row = await this.findOne(partnerId, contactId);
    if (!row) return null;
    await this.db.db
      .delete(partnerContacts)
      .where(and(eq(partnerContacts.partnerId, partnerId), eq(partnerContacts.id, contactId)));
    return row;
  }

  private toResponse(r: (typeof partnerContacts.$inferSelect)) {
    return {
      id: String(r.id),
      partner_id: r.partnerId ? String(r.partnerId) : '',
      full_name: r.fullName ?? '',
      position: r.position ?? '',
      phone: r.phone ?? '',
      email: r.email ?? '',
      is_primary: r.isPrimary ?? false,
      created_at: r.createdAt ? r.createdAt.toISOString() : '',
      updated_at: r.updatedAt ? r.updatedAt.toISOString() : '',
    };
  }
}
