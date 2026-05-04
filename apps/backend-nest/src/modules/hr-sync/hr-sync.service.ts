import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { and, eq, isNull, sql } from "drizzle-orm";
import { DatabaseService } from "../../database/database.service";
import { departments, positions, users } from "../../database/schema";

const MAX_NAME_LEN = 50;
const MAX_PHONE_LEN = 20;
const MAX_PERSONNEL_LEN = 32;
const MAX_EMAIL_LEN = 100;
const MAX_DEPT_POS_NAME = 255;

function hrRecordUuid(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  const uuidLowerCase = raw.trim().toLowerCase();
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      uuidLowerCase,
    )
  )
    return null;
  return uuidLowerCase;
}

function clip(value: string | null | undefined, max: number): string | null {
  if (value == null || value === "") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
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

  async runSyncWithLock(): Promise<
    { skipped: true } | { skipped: false; result: HrSyncRunResult }
  > {
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
      const departmentExternalUuid = hrRecordUuid(row.department?.id);
      const departmentName = row.department?.name?.trim();
      if (departmentExternalUuid && departmentName) {
        const displayName =
          clip(departmentName, MAX_DEPT_POS_NAME) ??
          departmentName.slice(0, MAX_DEPT_POS_NAME);
        hrDepts.set(departmentExternalUuid, displayName);
      }
      const positionExternalUuid = hrRecordUuid(row.position?.id);
      const positionName = row.position?.name?.trim();
      if (positionExternalUuid && positionName) {
        const displayName =
          clip(positionName, MAX_DEPT_POS_NAME) ??
          positionName.slice(0, MAX_DEPT_POS_NAME);
        hrPos.set(positionExternalUuid, displayName);
      }
    }

    for (const [externalHrUuid, displayName] of hrDepts) {
      const nameNormalizedLower = displayName.toLowerCase();
      const [byExt] = await db
        .select({ id: departments.id, name: departments.name })
        .from(departments)
        .where(eq(departments.externalHrId, externalHrUuid))
        .limit(1);

      if (byExt?.id) {
        if (byExt.name !== displayName) {
          await db
            .update(departments)
            .set({ name: displayName, updatedAt: new Date() })
            .where(eq(departments.id, byExt.id));
          deptUpdated += 1;
        }
        continue;
      }

      const [byName] = await db
        .select({ id: departments.id })
        .from(departments)
        .where(
          and(
            isNull(departments.externalHrId),
            sql`lower(trim(coalesce(${departments.name}, ''))) = ${nameNormalizedLower}`,
          ),
        )
        .limit(1);

      if (byName?.id) {
        await db
          .update(departments)
          .set({
            externalHrId: externalHrUuid,
            name: displayName,
            updatedAt: new Date(),
          })
          .where(eq(departments.id, byName.id));
        deptUpdated += 1;
        continue;
      }

      await db.insert(departments).values({
        name: displayName,
        externalHrId: externalHrUuid,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      deptCreated += 1;
    }

    for (const [externalHrUuid, displayName] of hrPos) {
      const nameNormalizedLower = displayName.toLowerCase();
      const [byExt] = await db
        .select({ id: positions.id, name: positions.name })
        .from(positions)
        .where(eq(positions.externalHrId, externalHrUuid))
        .limit(1);

      if (byExt?.id) {
        if (byExt.name !== displayName) {
          await db
            .update(positions)
            .set({ name: displayName, updatedAt: new Date() })
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
            sql`lower(trim(coalesce(${positions.name}, ''))) = ${nameNormalizedLower}`,
          ),
        )
        .limit(1);

      if (byName?.id) {
        await db
          .update(positions)
          .set({
            externalHrId: externalHrUuid,
            name: displayName,
            updatedAt: new Date(),
          })
          .where(eq(positions.id, byName.id));
        posUpdated += 1;
        continue;
      }

      await db.insert(positions).values({
        name: displayName,
        externalHrId: externalHrUuid,
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
    const url = this.config.get<string>("EXTERNAL_HR_USERS_URL")?.trim();
    const token = this.config.get<string>("EXTERNAL_HR_API_TOKEN")?.trim();
    if (!url || !token) {
      throw new ServiceUnavailableException(
        "Синхронизация не настроена: задайте EXTERNAL_HR_USERS_URL и EXTERNAL_HR_API_TOKEN",
      );
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`HR API ответ ${res.status}: ${text.slice(0, 500)}`);
    }

    const body = (await res.json()) as { data?: HrUserRow[] };
    const list = Array.isArray(body.data) ? body.data : [];
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    const db = this.db.db;

    const { departments: deptStats, positions: posStats } =
      await this.syncDepartmentsAndPositionsFromHr(list);

    const deptRows = await db
      .select({ id: departments.id, name: departments.name })
      .from(departments);
    const deptByNormName = new Map<string, string>();
    for (const departmentRow of deptRows) {
      const normalizedNameKey = departmentRow.name?.trim().toLowerCase();
      if (normalizedNameKey)
        deptByNormName.set(normalizedNameKey, String(departmentRow.id));
    }

    const posRows = await db
      .select({ id: positions.id, name: positions.name })
      .from(positions);
    const posByNormName = new Map<string, string>();
    for (const positionRow of posRows) {
      const normalizedNameKey = positionRow.name?.trim().toLowerCase();
      if (normalizedNameKey)
        posByNormName.set(normalizedNameKey, String(positionRow.id));
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

        const resolvedDepartmentId = resolveDeptId(row.department?.name);
        const resolvedPositionId = resolvePosId(row.position?.name);
        if (!resolvedDepartmentId && row.department?.name) {
          errors.push(
            `Отдел не найден по имени «${row.department.name}» (${emailRaw})`,
          );
        }
        if (!resolvedPositionId && row.position?.name) {
          errors.push(
            `Должность не найдена по имени «${row.position.name}» (${emailRaw})`,
          );
        }

        // patch — поля, приходящие из HR-системы. Используется и для UPDATE,
        // и для INSERT. КРИТИЧНО: тут НЕТ passwordHash / mustChangePassword /
        // twoFactorEnabled / lastLoginAt — это локальные поля PMDB, HR ими
        // не управляет. При UPDATE их трогать нельзя (затрутся пароли всех
        // пользователей). При INSERT — БД проставит дефолты из schema.ts.
        const patch = {
          externalUserId: row.id,
          personnelNumber: clip(row.tabel, MAX_PERSONNEL_LEN),
          hiredAt: row.hired_at || null,
          quitDate: row.quit_date || null,
          internalPhone: clip(
            row.personal?.internal_phone ?? null,
            MAX_PHONE_LEN,
          ),
          avatarUrl: row.personal?.avatar_url?.trim() || null,
          email:
            emailRaw.length > MAX_EMAIL_LEN
              ? emailRaw.slice(0, MAX_EMAIL_LEN)
              : emailRaw,
          lastName: clip(row.personal?.last_name ?? null, MAX_NAME_LEN),
          firstName: clip(row.personal?.first_name ?? null, MAX_NAME_LEN),
          middleName: clip(row.personal?.middle_name ?? null, MAX_NAME_LEN),
          phone: clip(row.personal?.phone ?? null, MAX_PHONE_LEN),
          isActive: row.is_active !== false,
          departmentId: resolvedDepartmentId,
          positionId: resolvedPositionId,
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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${row.email ?? row.id}: ${msg}`);
        this.logger.warn(`HR sync row error: ${msg}`);
      }
    }

    for (const row of list) {
      try {
        const emailRaw = row.email?.trim().toLowerCase();
        if (!emailRaw || !row.supervisor?.email?.trim()) continue;
        const supEmail = row.supervisor.email.trim().toLowerCase();
        const [employeeRow] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${emailRaw}`)
          .limit(1);
        const [supervisorRow] = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`lower(${users.email}) = ${supEmail}`)
          .limit(1);
        if (
          employeeRow?.id &&
          supervisorRow?.id &&
          String(employeeRow.id) !== String(supervisorRow.id)
        ) {
          await db
            .update(users)
            .set({
              supervisorId: String(supervisorRow.id),
              updatedAt: new Date(),
            })
            .where(eq(users.id, employeeRow.id));
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`supervisor ${row.email}: ${msg}`);
        this.logger.warn(`HR sync supervisor error: ${msg}`);
      }
    }

    this.logger.log(
      `HR sync: создано ${created}, обновлено ${updated}, ошибок ${errors.length}`,
    );
    return {
      created,
      updated,
      errors,
      departments: deptStats,
      positions: posStats,
    };
  }
}
