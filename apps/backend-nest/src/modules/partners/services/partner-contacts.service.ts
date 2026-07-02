import { and, asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { partnerContacts } from '../../../database/schema';
import {
  legacyPhoneFieldsFromPhones,
  loadContactPhonesByContactIds,
  parseContactPhonesFromBody,
  syncContactPhonesForContact,
  type PartnerContactPhoneDto,
} from '../partner-contact-phones';

@Injectable()
export class PartnerContactsService {
  private readonly logger = new Logger(PartnerContactsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(partnerId: string) {
    const rows = await this.db.db
      .select()
      .from(partnerContacts)
      .where(eq(partnerContacts.partnerId, partnerId))
      .orderBy(asc(partnerContacts.fullName));
    const phonesByContactId = await loadContactPhonesByContactIds(
      this.db,
      rows.map(row => String(row.id)),
    );
    return rows.map(row => this.toResponse(row, phonesByContactId.get(String(row.id))));
  }

  async findOne(partnerId: string, contactId: string) {
    const rows = await this.db.db
      .select()
      .from(partnerContacts)
      .where(and(eq(partnerContacts.partnerId, partnerId), eq(partnerContacts.id, contactId)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const phonesByContactId = await loadContactPhonesByContactIds(this.db, [String(row.id)]);
    return this.toResponse(row, phonesByContactId.get(String(row.id)));
  }

  async create(partnerId: string, data: Record<string, unknown>, userId?: string) {
    const isPrimary = data.is_primary === true || data.is_primary === 'true';
    if (isPrimary) {
      await this.db.db
        .update(partnerContacts)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(partnerContacts.partnerId, partnerId));
    }

    const phones = this.resolvePhones(data);
    const legacy = legacyPhoneFieldsFromPhones(phones);
    const insertData = {
      partnerId,
      fullName: data.full_name != null ? String(data.full_name) : null,
      position: data.position != null ? String(data.position) : null,
      phone: legacy.phone,
      phoneExt: legacy.phoneExt,
      email: data.email != null ? String(data.email) : null,
      isPrimary,
      ...(userId ? { createdBy: userId, updatedBy: userId } : {}),
    };
    const [row] = await this.db.db.insert(partnerContacts).values(insertData).returning();
    if (!row) return null;

    await syncContactPhonesForContact(this.db, String(row.id), phones);
    return this.findOne(partnerId, String(row.id));
  }

  async update(partnerId: string, contactId: string, data: Record<string, unknown>, userId?: string) {
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
      phone_ext: 'phoneExt',
      email: 'email',
      is_primary: 'isPrimary',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    if (userId) updateObj.updatedBy = userId;
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) {
        if (snake === 'is_primary') updateObj[camel] = isPrimary;
        else updateObj[camel] = data[snake];
      }
    }

    const phonesFromBody = parseContactPhonesFromBody(data);
    if (phonesFromBody !== undefined) {
      const legacy = legacyPhoneFieldsFromPhones(phonesFromBody);
      updateObj.phone = legacy.phone;
      updateObj.phoneExt = legacy.phoneExt;
    }

    await this.db.db
      .update(partnerContacts)
      .set(updateObj)
      .where(and(eq(partnerContacts.partnerId, partnerId), eq(partnerContacts.id, contactId)));

    if (phonesFromBody !== undefined) {
      await syncContactPhonesForContact(this.db, contactId, phonesFromBody);
    }

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

  private resolvePhones(data: Record<string, unknown>): PartnerContactPhoneDto[] {
    const parsed = parseContactPhonesFromBody(data);
    return parsed ?? [];
  }

  private toResponse(
    row: typeof partnerContacts.$inferSelect,
    phonesFromRel?: PartnerContactPhoneDto[],
  ) {
    const phones =
      phonesFromRel ??
      legacyPhonesFromRow(row.phone, row.phoneExt);
    const legacy = legacyPhoneFieldsFromPhones(phones);

    return {
      id: String(row.id),
      partner_id: row.partnerId ? String(row.partnerId) : '',
      full_name: row.fullName ?? '',
      position: row.position ?? '',
      phone: legacy.phone ?? '',
      phone_ext: legacy.phoneExt ?? '',
      phones,
      email: row.email ?? '',
      is_primary: row.isPrimary ?? false,
      created_at: row.createdAt ? row.createdAt.toISOString() : '',
      updated_at: row.updatedAt ? row.updatedAt.toISOString() : '',
    };
  }
}

function legacyPhonesFromRow(phone: string | null, phoneExt: string | null): PartnerContactPhoneDto[] {
  const normalized = normalizeLegacyPhoneRow(phone, phoneExt);
  return normalized ? [normalized] : [];
}

function normalizeLegacyPhoneRow(
  phone: string | null,
  phoneExt: string | null,
): PartnerContactPhoneDto | null {
  const phoneValue = String(phone ?? '').trim();
  const phoneExtValue = String(phoneExt ?? '').trim();
  if (!phoneValue && !phoneExtValue) return null;
  return {
    phone: phoneValue,
    ...(phoneExtValue ? { phone_ext: phoneExtValue } : {}),
  };
}
