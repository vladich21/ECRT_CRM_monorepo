import { asc, count, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as argon2 from 'argon2';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../database/database.service';
import { users, departments, positions, refGroups, relUsersGroups } from '../../../database/schema';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserPreviewDto } from '../dto/user-preview.dto';
import { DepartmentRefDto } from '../dto/department-ref.dto';
import { PositionRefDto } from '../dto/position-ref.dto';
import { RoleRefDto } from '../dto/role-ref.dto';
import { SupervisorRefDto } from '../dto/supervisor-ref.dto';
import { PaginationParams } from '../../../common/pagination';

const supervisorUser = alias(users, 'supervisor_user');

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly hrAssetBaseUrl: string;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {
    this.hrAssetBaseUrl = (this.config.get<string>('EXTERNAL_HR_ASSET_BASE_URL') ?? '').replace(/\/$/, '');
  }

  async findAll(
    preview?: 'active' | 'all' | 'full',
    useFullFormat?: boolean,
    pagination?: PaginationParams,
  ): Promise<{ data: UserResponseDto[] | UserPreviewDto[]; total: number }> {
    const activeFilter = preview === 'active' ? eq(users.isActive, true) : undefined;
    const usePreviewFormat = !useFullFormat && (preview === 'active' || preview === 'all');

    const runCount = async () => {
      let countQuery = this.db.db.select({ value: count() }).from(users);
      if (activeFilter) countQuery = countQuery.where(activeFilter) as typeof countQuery;
      const rows = await countQuery;
      return Number(rows[0]?.value ?? 0);
    };

    if (usePreviewFormat) {
      let baseSelect = this.db.db
        .select({
          id: users.id,
          lastName: users.lastName,
          firstName: users.firstName,
          middleName: users.middleName,
        })
        .from(users);
      if (activeFilter) baseSelect = baseSelect.where(activeFilter) as typeof baseSelect;
      const orderedPreview = baseSelect.orderBy(asc(users.lastName));
      const [total, rows] = await Promise.all([
        runCount(),
        pagination != null
          ? orderedPreview.limit(pagination.limit).offset(pagination.offset)
          : orderedPreview,
      ]);
      const data = rows.map((row) => ({
        id: String(row.id),
        name: [row.lastName, row.firstName, row.middleName].filter(Boolean).join(' ').trim() || String(row.id),
      }));
      return { data, total };
    }

    let baseQuery = this.db.db
      .select({
        user: users,
        departmentId: departments.id,
        departmentName: departments.name,
        positionId: positions.id,
        positionName: positions.name,
        supervisor: supervisorUser,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(positions, eq(users.positionId, positions.id))
      .leftJoin(supervisorUser, eq(users.supervisorId, supervisorUser.id));
    if (activeFilter) baseQuery = baseQuery.where(activeFilter) as typeof baseQuery;

    const orderedFull = baseQuery.orderBy(asc(users.lastName));
    const [total, userRows] = await Promise.all([
      runCount(),
      pagination != null
        ? orderedFull.limit(pagination.limit).offset(pagination.offset)
        : orderedFull,
    ]);

    const userIds = userRows.map((row) => row.user.id).filter(Boolean);
    const roleRows =
      userIds.length > 0
        ? await this.db.db
            .select({
              userId: relUsersGroups.userId,
              groupId: refGroups.id,
              groupName: refGroups.name,
            })
            .from(relUsersGroups)
            .innerJoin(refGroups, eq(relUsersGroups.groupId, refGroups.id))
            .where(inArray(relUsersGroups.userId, userIds))
        : [];

    const rolesByUser = new Map<string, RoleRefDto[]>();
    for (const roleRow of roleRows) {
      const userId = String(roleRow.userId);
      const list = rolesByUser.get(userId) ?? [];
      list.push({ id: String(roleRow.groupId), role_name: roleRow.groupName ?? '' });
      rolesByUser.set(userId, list);
    }

    const data = userRows.map((userRow) =>
      this.toResponse(userRow.user, {
        department: userRow.departmentId
          ? { id: String(userRow.departmentId), name: userRow.departmentName ?? '' }
          : { id: '', name: '' },
        position: userRow.positionId
          ? { id: String(userRow.positionId), name: userRow.positionName ?? '' }
          : { id: '', name: '' },
        roles: rolesByUser.get(String(userRow.user.id)) ?? [],
        supervisor: this.supervisorRefFromRow(userRow.supervisor),
      }),
    );
    return { data, total };
  }

  async update(id: string, data: Record<string, unknown>): Promise<UserResponseDto | null> {
    const user = await this.findOne(id);
    if (!user) return null;
    const map: Record<string, string> = {
      email: 'email',
      first_name: 'firstName',
      last_name: 'lastName',
      middle_name: 'middleName',
      phone: 'phone',
      is_active: 'isActive',
      department_id: 'departmentId',
      position_id: 'positionId',
    };
    const updateObj: Record<string, unknown> = { updatedAt: new Date() };
    for (const [snake, camel] of Object.entries(map)) {
      if (data[snake] !== undefined) {
        if (snake === 'is_active') updateObj[camel] = Boolean(data[snake]);
        else if (snake === 'department_id' || snake === 'position_id')
          updateObj[camel] = data[snake] != null && data[snake] !== '' ? data[snake] : null;
        else updateObj[camel] = data[snake];
      }
    }
    try {
      await this.db.db.update(users).set(updateObj).where(eq(users.id, id));
      if (data.role_ids !== undefined && Array.isArray(data.role_ids)) {
        await this.db.db.delete(relUsersGroups).where(eq(relUsersGroups.userId, id));
        const roleIds = data.role_ids.filter((x): x is string => typeof x === 'string');
        if (roleIds.length) {
          await this.db.db.insert(relUsersGroups).values(roleIds.map((groupId) => ({ userId: id, groupId })));
        }
      }
    } catch (error) {
      this.handleDbConflict(error);
    }
    return this.findOne(id);
  }

  async create(data: Record<string, unknown>): Promise<UserResponseDto | null> {
    const insertObj: Record<string, unknown> = {
      email: data.email != null ? String(data.email).trim().toLowerCase() : null,
      firstName: data.first_name != null ? String(data.first_name) : null,
      lastName: data.last_name != null ? String(data.last_name) : null,
      middleName: data.middle_name != null ? String(data.middle_name) : null,
      phone: data.phone != null ? String(data.phone) : null,
      isActive: data.is_active !== undefined ? Boolean(data.is_active) : false,
      departmentId: data.department_id != null && data.department_id !== '' ? String(data.department_id) : null,
      positionId: data.position_id != null && data.position_id !== '' ? String(data.position_id) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const [inserted] = await this.db.db.insert(users).values(insertObj).returning({ id: users.id });
      const userId = inserted?.id ? String(inserted.id) : null;
      if (!userId) return null;

      if (Array.isArray(data.role_ids)) {
        const roleIds = data.role_ids.filter((x): x is string => typeof x === 'string');
        if (roleIds.length > 0) {
          await this.db.db.insert(relUsersGroups).values(roleIds.map((groupId) => ({ userId, groupId })));
        }
      }

      return this.findOne(userId);
    } catch (error) {
      this.handleDbConflict(error);
    }
  }

  private handleDbConflict(error: unknown): never {
    const dbError = (error as { cause?: { code?: string; constraint?: string; detail?: string } })?.cause;
    if (dbError?.code === '23505' && dbError.constraint === 'users_email_idx') {
      throw new ConflictException('Пользователь с таким email уже существует');
    }
    if (dbError?.code === '23503') {
      throw new ConflictException('Невозможно выполнить операцию из-за связанных записей');
    }
    throw error as Error;
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1);
    const row = rows[0];
    return row ? { id: String(row.id) } : null;
  }

  async getPasswordHashByEmail(email: string): Promise<string | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1);
    const hash = rows[0]?.passwordHash;
    return hash ?? null;
  }

  async verifyPasswordByEmail(email: string, plainPassword: string): Promise<boolean> {
    const hash = await this.getPasswordHashByEmail(email);
    if (!hash) return false;
    return argon2.verify(hash, plainPassword);
  }

  async getAuthDataByEmail(email: string): Promise<{
    id: string;
    email: string;
    isActive: boolean;
    passwordHash: string | null;
    mustChangePassword: boolean;
    twoFactorEnabled: boolean;
  } | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({
        id: users.id,
        email: users.email,
        isActive: users.isActive,
        passwordHash: users.passwordHash,
        mustChangePassword: users.mustChangePassword,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      email: row.email ?? email,
      isActive: row.isActive ?? false,
      passwordHash: row.passwordHash ?? null,
      mustChangePassword: row.mustChangePassword ?? false,
      twoFactorEnabled: row.twoFactorEnabled ?? false,
    };
  }

  async findOneByEmail(email: string): Promise<UserResponseDto | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.findOne(String(row.id));
  }

  async setPasswordHash(id: string, hash: string, mustChangePassword = false): Promise<void> {
    await this.db.db
      .update(users)
      .set({ passwordHash: hash, mustChangePassword, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async setMustChangePassword(id: string, value: boolean): Promise<void> {
    await this.db.db
      .update(users)
      .set({ mustChangePassword: value, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.db.db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findOne(id: string): Promise<UserResponseDto | null> {
    const rows = await this.db.db
      .select({
        user: users,
        departmentId: departments.id,
        departmentName: departments.name,
        positionId: positions.id,
        positionName: positions.name,
        supervisor: supervisorUser,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(positions, eq(users.positionId, positions.id))
      .leftJoin(supervisorUser, eq(users.supervisorId, supervisorUser.id))
      .where(eq(users.id, id))
      .limit(1);

    const firstRow = rows[0];
    if (!firstRow) return null;

    const roleRows = await this.db.db
      .select({ groupId: refGroups.id, groupName: refGroups.name })
      .from(relUsersGroups)
      .innerJoin(refGroups, eq(relUsersGroups.groupId, refGroups.id))
      .where(eq(relUsersGroups.userId, id));

    const roles: RoleRefDto[] = roleRows.map((roleGroup) => ({
      id: String(roleGroup.groupId),
      role_name: roleGroup.groupName ?? '',
    }));

    return this.toResponse(firstRow.user, {
      department: firstRow.departmentId
        ? { id: String(firstRow.departmentId), name: firstRow.departmentName ?? '' }
        : { id: '', name: '' },
      position: firstRow.positionId
        ? { id: String(firstRow.positionId), name: firstRow.positionName ?? '' }
        : { id: '', name: '' },
      roles,
      supervisor: this.supervisorRefFromRow(firstRow.supervisor),
    });
  }

  private supervisorRefFromRow(
    row: typeof users.$inferSelect | null,
  ): SupervisorRefDto | null {
    if (!row?.id) return null;
    const name = [row.lastName, row.firstName, row.middleName].filter(Boolean).join(' ').trim();
    return {
      id: String(row.id),
      email: row.email ?? '',
      name: name || (row.email ?? ''),
    };
  }

  private toAbsoluteAvatarUrl(relativeOrAbsolute: string | null): string | null {
    if (!relativeOrAbsolute?.trim()) return null;
    const v = relativeOrAbsolute.trim();
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (!this.hrAssetBaseUrl) return v;
    return `${this.hrAssetBaseUrl}${v.startsWith('/') ? '' : '/'}${v}`;
  }

  private formatDate(d: Date | string | null | undefined): string | null {
    if (d == null) return null;
    if (d instanceof Date) return d.toISOString().slice(0, 10);
    const s = String(d);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  private toResponse(
    user: typeof users.$inferSelect,
    refs: {
      department: DepartmentRefDto;
      position: PositionRefDto;
      roles: RoleRefDto[];
      supervisor: SupervisorRefDto | null;
    },
  ): UserResponseDto {
    return {
      id: String(user.id),
      email: user.email ?? '',
      first_name: user.firstName ?? '',
      last_name: user.lastName ?? '',
      middle_name: user.middleName ?? '',
      phone: user.phone ?? '',
      is_active: user.isActive ?? false,
      created_at: user.createdAt ? user.createdAt.toISOString() : '',
      updated_at: user.updatedAt ? user.updatedAt.toISOString() : '',
      department: refs.department,
      position: refs.position,
      roles: refs.roles,
      external_user_id: user.externalUserId ? String(user.externalUserId) : null,
      personnel_number: user.personnelNumber ?? null,
      hired_at: this.formatDate(user.hiredAt),
      quit_date: this.formatDate(user.quitDate),
      internal_phone: user.internalPhone ?? null,
      avatar_url: this.toAbsoluteAvatarUrl(user.avatarUrl ?? null),
      supervisor: refs.supervisor,
    };
  }
}
