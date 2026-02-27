import { asc, eq, inArray } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { users, departments, positions, refGroups, relUsersGroups } from '../../../database/schema';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserPreviewDto } from '../dto/user-preview.dto';
import { DepartmentRefDto } from '../dto/department-ref.dto';
import { PositionRefDto } from '../dto/position-ref.dto';
import { RoleRefDto } from '../dto/role-ref.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(
    preview?: 'active' | 'all' | 'full',
    useFullFormat?: boolean,
  ): Promise<UserResponseDto[] | UserPreviewDto[]> {
    // active: только активные (preview=1), all: все (preview=2)
    // useFullFormat: при full=1 возвращать полные объекты (login, email, department, position, roles)
    const activeFilter = preview === 'active' ? eq(users.isActive, true) : undefined;
    const usePreviewFormat = !useFullFormat && (preview === 'active' || preview === 'all');

    if (usePreviewFormat) {
      this.logger.debug(`Получение списка пользователей (preview=${preview})`);
      const baseSelect = this.db.db
        .select({
          id: users.id,
          lastName: users.lastName,
          firstName: users.firstName,
          middleName: users.middleName,
        })
        .from(users)
        .orderBy(asc(users.login));
      const previewRows = activeFilter ? await baseSelect.where(activeFilter) : await baseSelect;
      return previewRows.map((row) => ({
        id: String(row.id),
        name: [row.lastName, row.firstName, row.middleName].filter(Boolean).join(' ').trim() || String(row.id),
      }));
    }

    this.logger.debug('Получение полного списка пользователей');
    const baseQuery = this.db.db
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
      .orderBy(asc(users.login));
    const userRows = activeFilter ? await baseQuery.where(activeFilter) : await baseQuery;

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

    return userRows.map((userRow) =>
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
  }

  async update(id: string, data: Record<string, unknown>): Promise<UserResponseDto | null> {
    this.logger.debug(`Обновление пользователя id: ${id}`);
    const user = await this.findOne(id);
    if (!user) return null;
    const map: Record<string, string> = {
      login: 'login',
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

  async findByLogin(login: string): Promise<{ id: string } | null> {
    if (!login?.trim()) return null;
    const rows = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.login, login.trim()))
      .limit(1);
    const row = rows[0];
    return row ? { id: String(row.id) } : null;
  }

  async findOneByLogin(login: string): Promise<UserResponseDto | null> {
    const preview = await this.findByLogin(login);
    if (!preview) return null;
    return this.findOne(preview.id);
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
      login: user.login ?? '',
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
