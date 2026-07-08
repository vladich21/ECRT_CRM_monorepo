import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../../../database/database.service';
import type { SectionPermission, ActionType } from '../../../shared/permissions';

@Injectable()
export class PermissionsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Snapshot прав пользователя - ложится в JWT и в request.user.
   * Несколько ролей агрегируются через BOOL_OR.
   * Папки (is_folder=true) исключаются.
   */
  async getUserSectionPermissions(userId: string): Promise<SectionPermission[]> {
    const result = await this.db.db.execute(sql`
      SELECT
        s.code AS section_code,
        BOOL_OR(rsp.can_read)   AS can_read,
        BOOL_OR(rsp.can_edit)   AS can_edit,
        BOOL_OR(rsp.can_delete) AS can_delete
      FROM sections s
      JOIN rel_role_section_permissions rsp ON s.id = rsp.section_id
      JOIN rel_users_roles ur ON ur.role_id = rsp.role_id
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = ${userId}
        AND s.is_active = TRUE
        AND s.is_folder = FALSE
        AND r.is_active = TRUE
      GROUP BY s.code
    `);

    return result.rows.map((row) => ({
      sectionCode: row.section_code as string,
      canRead: Boolean(row.can_read),
      canEdit: Boolean(row.can_edit),
      canDelete: Boolean(row.can_delete),
    }));
  }

  /**
   * Проверка одного права для уже загруженного snapshot'а.
   */
  hasSectionPermission(
    permissions: SectionPermission[] | undefined,
    sectionCode: string,
    action: ActionType,
  ): boolean {
    if (!permissions?.length) return false;
    const perm = permissions.find((p) => p.sectionCode === sectionCode);
    if (!perm) return false;
    if (action === 'read') return perm.canRead;
    if (action === 'edit') return perm.canEdit;
    return perm.canDelete;
  }
}
