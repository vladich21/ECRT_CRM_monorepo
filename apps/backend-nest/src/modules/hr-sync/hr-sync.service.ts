import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { departments, positions, users } from '../../database/schema';

const MAX_NAME_LEN = 50;
const MAX_PHONE_LEN = 20;
const MAX_PERSONNEL_LEN = 32;
const MAX_EMAIL_LEN = 100;
const MAX_DEPT_POS_NAME = 255;

function hrRecordUuid(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const v = raw.trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) return null;
  return v;
}

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

export type HrSyncRunResult = {
  created: number;
  updated: number;
  errors: string[];
  departments: { created: number; updated: number };
  positions: { created: number; updated: number };
};

@Injectable()
export class HrSyncService {
  private readonly logger = new Logger(HrSyncService.name);
  private syncInProgress = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async runSyncWithLock(): Promise<{ skipped: true } | { skipped: false; result: HrSyncRunResult }> {
    if (this.syncInProgress) {
      return { skipped: true };
    }
    this.syncInProgress = true;
    try {
      const result = await this.syncUsersFromHrApi();
      return { skipped: false, result };
    } finally {
      this.syncInProgress = false;
    }
  }

  isSyncRunning(): boolean {
    return this.syncInProgress;
  }

  private async syncDepartmentsAndPositionsFromHr(list: HrUserRow[]): Promise<{
    departments: { created: number; updated: number };
    positions: { created: number; updated: number };
  }> {
    const db = this.db.db;
    let deptCreated = 0;
    let deptUpdated = 0;
    let posCreated = 0;
    let posUpdated = 0;

    const hrDepts = new Map<string, string>();
    const hrPos = new Map<string, string>();
    for (const row of list) {
      const dId = hrRecordUuid(row.department?.id);
      const dName = row.department?.name?.trim();
      if (dId && dName) {
        const nm = clip(dName, MAX_DEPT_POS_NAME) ?? dName.slice(0, MAX_DEPT_POS_NAME);
        hrDepts.set(dId, nm);
      }
      const pId = hrRecordUuid(row.position?.id);
      const pName = row.position?.name?.trim();
      if (pId && pName) {
        const nm = clip(pName, MAX_DEPT_POS_NAME) ?? pName.slice(0, MAX_DEPT_POS_NAME);
        hrPos.set(pId, nm);
      }
    }

    for (const [extId, nm] of hrDepts) {
      const norm = nm.toLowerCase();
      const [byExt] = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.externalHrId, extId))
        .limit(1);

      if (byExt?.id) {
        if (byExt.name !== nm) {
          await db
            .update(departments)
            .set({ name: nm, updatedAt: new Date() })
            .where(eq(departments.id, byExt.id));
          deptUpdated += 1;
        }
        continue;
      }

      const [byName] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(isNull(departments.externalHrId), sql`lower(trim(coalesce(${departments.name}, ''))) = ${norm}`))
        .limit(1);

      if (byName?.id) {
        await db
          .update(departments)
          .set({ externalHrId: extId, name: nm, updatedAt: new Date() })
          .where(eq(departments.id, byName.id));
        deptUpdated += 1;
        continue;
      }

      await db.insert(departments).values({
        name: nm,
        externalHrId: extId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      deptCreated += 1;
    }

    for (const [extId, nm] of hrPos) {
      const norm = nm.toLowerCase();
      const [byExt] = await db
        .select({ id: positions.id, name: positions.name })
        .from(positions)
        .where(eq(positions.externalHrId, extId))
        .limit(1);

      if (byExt?.id) {
        if (byExt.name !== nm) {
          await db
            .update(positions)
            .set({ name: nm, updatedAt: new Date() })
            .where(eq(positions.id, byExt.id));
          posUpdated += 1;
        }
        continue;
      }

      const [byName] = await db
        .select({ id: positions.id })
        .from(positions)
        .where(
          and(
            isNull(positions.externalHrId),
            sql`lower(trim(coalesce(${positions.name}, ''))) = ${norm}`,
          ),
        )
        .limit(1);

      if (byName?.id) {
        await db
          .update(positions)
          .set({ externalHrId: extId, name: nm, updatedAt: new Date() })
          .where(eq(positions.id, byName.id));
        posUpdated += 1;
        continue;
      }

      await db.insert(positions).values({
        name: nm,
        externalHrId: extId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      posCreated += 1;
    }

    this.logger.log(
      `HR справочники: отделы +${deptCreated}/~${deptUpdated}, должности +${posCreated}/~${posUpdated}`,
    );
    return {
      departments: { created: deptCreated, updated: deptUpdated },
      positions: { created: posCreated, updated: posUpdated },
    };
  }

  async syncUsersFromHrApi(): Promise<HrSyncRunResult> {
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

    const refStats = await this.syncDepartmentsAndPositionsFromHr(list);

    const deptRows = await db.select({ id: departments.id, name: departments.name }).from(departments);
    const deptByNormName = new Map<string, string>();
    for (const d of deptRows) {
      const k = d.name?.trim().toLowerCase();
      if (k) deptByNormName.set(k, String(d.id));
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
    return { created, updated, errors, ...refStats };
  }
}
