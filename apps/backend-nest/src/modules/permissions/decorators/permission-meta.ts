import { SetMetadata } from '@nestjs/common';
import type { SectionCode, ActionType } from '../../../shared/permissions';

export const REQUIRE_PERMISSION_KEY = 'requirePermission';
export const REQUIRE_ANY_PERMISSION_KEY = 'requireAnyPermission';

export interface RequirePermissionMeta {
  section: SectionCode;
  action: ActionType;
}

export interface RequireAnyPermissionMeta {
  sections: SectionCode[];
  action: ActionType;
}

/**
 * Требует у пользователя право <action> на раздел <section>.
 *
 * Применять после JwtGuard:
 *   @UseGuards(JwtGuard, PermissionsGuard)
 *   @RequirePermission(SECTIONS.PARTNERS_LIST, 'edit')
 */
export const RequirePermission = (section: SectionCode, action: ActionType) =>
  SetMetadata<string, RequirePermissionMeta>(REQUIRE_PERMISSION_KEY, { section, action });

/**
 * Требует у пользователя право <action> хотя бы на один из разделов <sections>.
 */
export const RequireAnyPermission = (sections: SectionCode[], action: ActionType) =>
  SetMetadata<string, RequireAnyPermissionMeta>(REQUIRE_ANY_PERMISSION_KEY, { sections, action });
