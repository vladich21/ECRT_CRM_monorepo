import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { departments, positions, users } from '../../database/schema';

const MAX_NAME_LEN = 50;
const MAX_PHONE_LEN = 20;
const MAX_PERSONNEL_LEN = 32;
const MAX_EMAIL_LEN = 100;

function clip(s: string | null | undefined, max: number): string | null {
  if (s == null || s === '') return null;
  const t = s.trim();
  if (!t) return null;
  return t.length <= max ? t : t.slice(0, max);
}

type HrPersonal = {
  last_name?: string;
  first_name?: string;
  middle_name?: string;
  phone?: string | null;
  internal_phone?: string | null;
  avatar_url?: string | null;
};

type HrUserRow = {
  id: string;
  tabel?: string;
  email: string;
  is_active?: boolean;
  hired_at?: string | null;
  quit_date?: string | null;
  personal?: HrPersonal;
  position?: { id: string; name: string };
  department?: { id: string; name: string };
  supervisor?: { id: string; email: string; name: string } | null;
};

@Injectable()
export class HrSyncService {
  private readonly logger = new Logger(HrSyncService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async syncUsersFromHrApi(): Promise<{ created: number; updated: number; errors: string[] }> {
    const url = this.config.get<string>('EXTERNAL_HR_USERS_URL')?.trim();
    const token = this.config.get<string>('EXTERNAL_HR_API_TOKEN')?.trim();
    if (!url || !token) {
      throw new ServiceUnavailableException(
        'Синхронизация не настроена: задайте EXTERNAL_HR_USERS_URL и EXTERNAL_HR_API_TOKEN',
      );
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HR API ответ ${res.status}: ${text.slice(0, 500)}`);
    }

    const body = (await res.json()) as { data?: HrUserRow[] };
    const list = Array.isArray(body.data) ? body.data : [];
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    const db = this.db.db;

    const deptRows = await db
      .select({ id: departments.id, name: departments.name, shortName: departments.shortName })
      .from(departments);
    const deptByNormName = new Map<string, string>();
    for (const d of deptRows) {
      for (const label of [d.name, d.shortName]) {
        const k = label?.trim().toLowerCase();
        if (k) deptByNormName.set(k, String(d.id));
      }
    }

    const posRows = await db.select({ id: positions.id, name: positions.name }).from(positions);
    const posByNormName = new Map<string, string>();
    for (const p of posRows) {
      const k = p.name?.trim().toLowerCase();
      if (k) posByNormName.set(k, String(p.id));
    }

    const resolveDeptId = (name: string | null | undefined): string | null => {
      if (!name?.trim()) return null;
      return deptByNormName.get(name.trim().toLowerCase()) ?? null;
    };

    const resolvePosId = (name: string | null | undefined): string | null => {
      if (!name?.trim()) return null;
      return posByNormName.get(name.trim().toLowerCase()) ?? null;
    };

    for (const row of list) {
      try {
        const emailRaw = row.email?.trim().toLowerCase();
        if (!emailRaw) {
          errors.push(`Пропуск записи без email, external id=${row.id}`);
          continue;
        }

        const deptId = resolveDeptId(row.department?.name);
        const posId = resolvePosId(row.position?.name);
        if (!deptId && row.department?.name) {
          errors.push(`Отдел не найден по имени «${row.department.name}» (${emailRaw})`);
        }
        if (!posId && row.position?.name) {
          errors.push(`Должность не найдена по имени «${row.position.name}» (${emailRaw})`);
        }

        const patch = {
          externalUserId: row.id,
          personnelNumber: clip(row.tabel, MAX_PERSONNEL_LEN),
          hiredAt: row.hired_at || null,
          quitDate: row.quit_date || null,
          internalPhone: clip(row.personal?.internal_phone ?? null, MAX_PHONE_LEN),
          avatarUrl: row.personal?.avatar_url?.trim() || null,
          email: emailRaw.length > MAX_EMAIL_LEN ? emailRaw.slice(0, MAX_EMAIL_LEN) : emailRaw,
          lastName: clip(row.personal?.last_name ?? null, MAX_NAME_LEN),
          firstName: clip(row.personal?.first_name ?? null, MAX_NAME_LEN),
          middleName: clip(row.personal?.middle_name ?? null, MAX_NAME_LEN),
          phone: clip(row.personal?.phone ?? null, MAX_PHONE_LEN),
          isActive: row.is_active !== false,
          departmentId: deptId,
          positionId: posId,
          supervisorId: null as string | null,
          updatedAt: new Date(),
        };

        const [existing] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${emailRaw}`)
          .limit(1);

        if (existing?.id) {
          await db.update(users).set(patch).where(eq(users.id, existing.id));
          updated += 1;
        } else {
          await db.insert(users).values({
            ...patch,
            createdAt: new Date(),
          });
          created += 1;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${row.email ?? row.id}: ${msg}`);
        this.logger.warn(`HR sync row error: ${msg}`);
      }
    }

    for (const row of list) {
      try {
        const emailRaw = row.email?.trim().toLowerCase();
        if (!emailRaw || !row.supervisor?.email?.trim()) continue;
        const supEmail = row.supervisor.email.trim().toLowerCase();
        const [u] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${emailRaw}`)
          .limit(1);
        const [s] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${supEmail}`)
          .limit(1);
        if (u?.id && s?.id && String(u.id) !== String(s.id)) {
          await db
            .update(users)
            .set({ supervisorId: String(s.id), updatedAt: new Date() })
            .where(eq(users.id, u.id));
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`supervisor ${row.email}: ${msg}`);
        this.logger.warn(`HR sync supervisor error: ${msg}`);
      }
    }

    this.logger.log(`HR sync: создано ${created}, обновлено ${updated}, ошибок ${errors.length}`);
    return { created, updated, errors };
  }
}
