import { asc, count, eq, inArray } from 'drizzle-orm';
import * as argon2 from 'argon2';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { users, departments, positions, refGroups, relUsersGroups } from '../../../database/schema';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserPreviewDto } from '../dto/user-preview.dto';
import { DepartmentRefDto } from '../dto/department-ref.dto';
import { PositionRefDto } from '../dto/position-ref.dto';
import { RoleRefDto } from '../dto/role-ref.dto';
import { PaginationParams } from '../../../common/pagination';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(
    preview?: 'active' | 'all' | 'full',
    useFullFormat?: boolean,
    pagination?: PaginationParams,
  ): Promise<{ data: UserResponseDto[] | UserPreviewDto[]; total: number }> {
    const { limit = 50, offset = 0 } = pagination ?? { limit: 50, offset: 0 };
    const activeFilter = preview === 'active' ? eq(users.isActive, true) : undefined;
    const usePreviewFormat = !useFullFormat && (preview === 'active' || preview === 'all');

    const runCount = async () => {
      let countQuery = this.db.db.select({ value: count() }).from(users);
      if (activeFilter) countQuery = countQuery.where(activeFilter) as typeof countQuery;
      const rows = await countQuery;
      return Number(rows[0]?.value ?? 0);
    };

    if (usePreviewFormat) {
      this.logger.debug(`Получение списка пользователей (preview=${preview})`);
      let baseSelect = this.db.db
        .select({
          id: users.id,
          lastName: users.lastName,
          firstName: users.firstName,
          middleName: users.middleName,
        })
        .from(users);
      if (activeFilter) baseSelect = baseSelect.where(activeFilter) as typeof baseSelect;
      const [total, rows] = await Promise.all([
        runCount(),
        baseSelect.orderBy(asc(users.lastName)).limit(limit).offset(offset),
      ]);
      const data = rows.map((row) => ({
        id: String(row.id),
        name: [row.lastName, row.firstName, row.middleName].filter(Boolean).join(' ').trim() || String(row.id),
      }));
      return { data, total };
    }

    this.logger.debug('Получение полного списка пользователей');
    let baseQuery = this.db.db
      .select({
        user: users,
        departmentId: departments.id,
        departmentName: departments.name,
        positionId: positions.id,
        positionName: positions.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(positions, eq(users.positionId, positions.id));
    if (activeFilter) baseQuery = baseQuery.where(activeFilter) as typeof baseQuery;

    const [total, userRows] = await Promise.all([
      runCount(),
      baseQuery.orderBy(asc(users.lastName)).limit(limit).offset(offset),
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
      }),
    );
    return { data, total };
  }

  async update(id: string, data: Record<string, unknown>): Promise<UserResponseDto | null> {
    this.logger.debug(`Обновление пользователя id: ${id}`);
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
    await this.db.db.update(users).set(updateObj).where(eq(users.id, id));
    if (data.role_ids !== undefined && Array.isArray(data.role_ids)) {
      await this.db.db.delete(relUsersGroups).where(eq(relUsersGroups.userId, id));
      const roleIds = data.role_ids.filter((x): x is string => typeof x === 'string');
      if (roleIds.length) {
        await this.db.db.insert(relUsersGroups).values(roleIds.map((groupId) => ({ userId: id, groupId })));
      }
    }
    return this.findOne(id);
  }

  async findByEmail(email: string): Promise<{ id: string } | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);
    const row = rows[0];
    return row ? { id: String(row.id) } : null;
  }

  async getPasswordHashByEmail(email: string): Promise<string | null> {
    if (!email?.trim()) return null;
    const rows = await this.db.db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
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
      .where(eq(users.email, email.trim().toLowerCase()))
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
      .where(eq(users.email, email.trim().toLowerCase()))
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
    this.logger.debug(`Получение пользователя по id: ${id}`);
    const rows = await this.db.db
      .select({
        user: users,
        departmentId: departments.id,
        departmentName: departments.name,
        positionId: positions.id,
        positionName: positions.name,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .leftJoin(positions, eq(users.positionId, positions.id))
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
    });
  }

  private toResponse(
    user: (typeof users.$inferSelect),
    refs: { department: DepartmentRefDto; position: PositionRefDto; roles: RoleRefDto[] },
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
    };
  }
}
