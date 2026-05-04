import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, count, eq, inArray } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import {
  roles,
  sections,
  relUsersRoles,
  relRoleSectionPermissions,
  users,
} from '../../../database/schema';
import { PermissionsVersionService } from '../../permissions/services/permissions-version.service';
import type { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto';

interface PermissionFlagsDto {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

@Injectable()
export class AdminRbacService {
  constructor(
    private readonly db: DatabaseService,
    private readonly permissionsVersion: PermissionsVersionService,
  ) {}

  // ────────────────── ROLES ──────────────────

  async listRoles() {
    const roleRows = await this.db.db.select().from(roles).orderBy(asc(roles.name));

    const memberCounts = await this.db.db
      .select({ roleId: relUsersRoles.roleId, cnt: count() })
      .from(relUsersRoles)
      .groupBy(relUsersRoles.roleId);
    const memberMap = new Map(memberCounts.map((r) => [String(r.roleId), Number(r.cnt)]));

    const permCounts = await this.db.db
      .select({ roleId: relRoleSectionPermissions.roleId, cnt: count() })
      .from(relRoleSectionPermissions)
      .groupBy(relRoleSectionPermissions.roleId);
    const permMap = new Map(permCounts.map((r) => [String(r.roleId), Number(r.cnt)]));

    return roleRows.map((r) => ({
      id: String(r.id),
      code: r.code,
      name: r.name,
      description: r.description ?? '',
      is_active: r.isActive,
      is_system: r.isSystem,
      member_count: memberMap.get(String(r.id)) ?? 0,
      permission_count: permMap.get(String(r.id)) ?? 0,
      created_at: r.createdAt?.toISOString() ?? '',
      updated_at: r.updatedAt?.toISOString() ?? null,
    }));
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.db.db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.code, dto.code))
      .limit(1);
    if (existing.length) throw new ConflictException(`Роль с code='${dto.code}' уже существует`);

    const [row] = await this.db.db
      .insert(roles)
      .values({
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        isActive: dto.is_active ?? true,
        isSystem: false,
      })
      .returning();
    this.permissionsVersion.bump();
    return { id: String(row.id) };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.findRoleOrFail(id);
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) update.name = dto.name;
    if (dto.description !== undefined) update.description = dto.description;
    if (dto.is_active !== undefined) {
      if (role.isSystem && dto.is_active === false) {
        throw new BadRequestException('Системную роль нельзя деактивировать');
      }
      update.isActive = dto.is_active;
    }
    await this.db.db.update(roles).set(update).where(eq(roles.id, id));
    this.permissionsVersion.bump();
    return { success: true };
  }

  async deleteRole(id: string) {
    const role = await this.findRoleOrFail(id);
    if (role.isSystem) throw new BadRequestException('Системную роль нельзя удалить');
    await this.db.db.delete(roles).where(eq(roles.id, id));
    this.permissionsVersion.bump();
    return { success: true };
  }

  // ────────────────── ROLE PERMISSIONS ──────────────────

  async getRolePermissions(roleId: string) {
    await this.findRoleOrFail(roleId);

    const sectionRows = await this.db.db
      .select()
      .from(sections)
      .orderBy(asc(sections.sortOrder));

    const permRows = await this.db.db
      .select()
      .from(relRoleSectionPermissions)
      .where(eq(relRoleSectionPermissions.roleId, roleId));
    const permBySectionId = new Map(
      permRows.map((p) => [
        String(p.sectionId),
        { canRead: p.canRead, canEdit: p.canEdit, canDelete: p.canDelete },
      ]),
    );

    return {
      sections: sectionRows.map((s) => ({
        id: String(s.id),
        code: s.code,
        name: s.name,
        parent_id: s.parentId ? String(s.parentId) : null,
        is_folder: s.isFolder,
        sort_order: s.sortOrder,
        permissions: s.isFolder
          ? null
          : permBySectionId.get(String(s.id)) ?? { canRead: false, canEdit: false, canDelete: false },
      })),
    };
  }

  async updateRolePermissions(roleId: string, perms: Record<string, PermissionFlagsDto>) {
    await this.findRoleOrFail(roleId);

    if (!perms || typeof perms !== 'object') {
      throw new BadRequestException('permissions: ожидается объект');
    }
    const codes = Object.keys(perms);
    if (codes.length === 0) {
      throw new BadRequestException('Список разделов пуст');
    }
    for (const code of codes) {
      const flags = perms[code];
      if (!flags || typeof flags !== 'object') {
        throw new BadRequestException(`permissions[${code}]: ожидается объект флагов`);
      }
      if (typeof flags.canRead !== 'boolean'
        || typeof flags.canEdit !== 'boolean'
        || typeof flags.canDelete !== 'boolean') {
        throw new BadRequestException(`permissions[${code}]: canRead/canEdit/canDelete должны быть boolean`);
      }
    }

    const sectionRows = await this.db.db
      .select({ id: sections.id, code: sections.code, isFolder: sections.isFolder })
      .from(sections)
      .where(inArray(sections.code, codes));

    const sectionByCode = new Map(sectionRows.map((s) => [s.code, s]));
    for (const code of codes) {
      const sec = sectionByCode.get(code);
      if (!sec) throw new BadRequestException(`Раздел '${code}' не найден`);
      if (sec.isFolder) throw new BadRequestException(`Раздел '${code}' — папка, права не выдаются`);
    }

    await this.db.db.transaction(async (tx) => {
      const sectionIdsToDelete = sectionRows.map((s) => s.id);
      await tx
        .delete(relRoleSectionPermissions)
        .where(
          and(
            eq(relRoleSectionPermissions.roleId, roleId),
            inArray(relRoleSectionPermissions.sectionId, sectionIdsToDelete),
          ),
        );

      const inserts: Array<{
        roleId: string;
        sectionId: string;
        canRead: boolean;
        canEdit: boolean;
        canDelete: boolean;
      }> = [];
      for (const code of codes) {
        const sec = sectionByCode.get(code)!;
        const flags = perms[code];
        // Зависимости: delete → edit → read. Снижаем флаги если нарушены.
        const canDelete = !!flags.canDelete;
        const canEdit = !!flags.canEdit || canDelete;
        const canRead = !!flags.canRead || canEdit;
        if (!canRead && !canEdit && !canDelete) continue;
        inserts.push({
          roleId,
          sectionId: String(sec.id),
          canRead,
          canEdit,
          canDelete,
        });
      }
      if (inserts.length) {
        await tx.insert(relRoleSectionPermissions).values(inserts);
      }
    });

    this.permissionsVersion.bump();
    return { success: true };
  }

  // ────────────────── SECTIONS ──────────────────

  async listSections() {
    const rows = await this.db.db.select().from(sections).orderBy(asc(sections.sortOrder));
    return rows.map((s) => ({
      id: String(s.id),
      code: s.code,
      name: s.name,
      parent_id: s.parentId ? String(s.parentId) : null,
      is_folder: s.isFolder,
      sort_order: s.sortOrder,
      is_active: s.isActive,
    }));
  }

  // ────────────────── USER ROLES ──────────────────

  async getUserRoles(userId: string) {
    const userExists = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!userExists.length) throw new NotFoundException('Пользователь не найден');

    const userRoleRows = await this.db.db
      .select({ roleId: relUsersRoles.roleId })
      .from(relUsersRoles)
      .where(eq(relUsersRoles.userId, userId));

    return {
      role_ids: userRoleRows.map((r) => String(r.roleId)),
    };
  }

  async assignUserRoles(userId: string, roleIds: string[]) {
    const userExists = await this.db.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!userExists.length) throw new NotFoundException('Пользователь не найден');

    if (roleIds.length) {
      const validRoles = await this.db.db
        .select({ id: roles.id })
        .from(roles)
        .where(inArray(roles.id, roleIds));
      if (validRoles.length !== roleIds.length) {
        throw new BadRequestException('Одна или несколько ролей не найдены');
      }
    }

    await this.db.db.transaction(async (tx) => {
      await tx.delete(relUsersRoles).where(eq(relUsersRoles.userId, userId));
      if (roleIds.length) {
        await tx.insert(relUsersRoles).values(
          roleIds.map((roleId) => ({ userId, roleId })),
        );
      }
    });
    this.permissionsVersion.bump();
    return { success: true };
  }

  // ────────────────── helpers ──────────────────

  private async findRoleOrFail(id: string) {
    const rows = await this.db.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!rows.length) throw new NotFoundException('Роль не найдена');
    return rows[0];
  }
}
