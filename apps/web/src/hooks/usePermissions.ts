import { useCallback, useMemo } from 'react';

import { useAuthStore } from '../store/AuthStore';
import type { ActionType, SectionCode, SectionPermission } from '../shared/permissions';

interface UsePermissionsResult {
  /** Текущий снимок прав (из стейта; синхронизируется с бэком через /auth/me) */
  sectionPermissions: SectionPermission[];

  /** Может ли пользователь читать раздел */
  canRead: (section: SectionCode | string) => boolean;

  /** Может ли редактировать (включая создание) */
  canEdit: (section: SectionCode | string) => boolean;

  /** Может ли удалять */
  canDelete: (section: SectionCode | string) => boolean;

  /** Низкоуровневая проверка по строковому action */
  hasSectionPermission: (section: SectionCode | string, action: ActionType) => boolean;

  /** Хотя бы один из разделов с указанным action */
  hasAnySectionPermission: (
    sections: ReadonlyArray<SectionCode | string>,
    action: ActionType,
  ) => boolean;

  /** Все из разделов с указанным action */
  hasAllSectionPermissions: (
    sections: ReadonlyArray<SectionCode | string>,
    action: ActionType,
  ) => boolean;
}

/**
 * Хук-обертка над useAuthStore для проверки прав.
 *
 * Источник правды — useAuthStore.sectionPermissions (после GET /auth/me).
 * До заполнения стора приватная зона не рендерится (см. PrivateRoute). JWT
 * хранит snapshot; бэкенд при mismatch pv перевыпускает cookie — актуальные
 * права приходят при следующем вызове refreshSessionUser().
 */
export function usePermissions(): UsePermissionsResult {
  const sectionPermissions = useAuthStore((state) => state.sectionPermissions);

  const indexed = useMemo(() => {
    const map = new Map<string, SectionPermission>();
    for (const permission of sectionPermissions) {
      map.set(permission.sectionCode, permission);
    }
    return map;
  }, [sectionPermissions]);

  const hasSectionPermission = useCallback(
    (section: string, action: ActionType): boolean => {
      const permission = indexed.get(section);
      if (!permission) return false;
      if (action === 'read') return permission.canRead;
      if (action === 'edit') return permission.canEdit;
      return permission.canDelete;
    },
    [indexed],
  );

  const canRead = useCallback(
    (section: string) => hasSectionPermission(section, 'read'),
    [hasSectionPermission],
  );
  const canEdit = useCallback(
    (section: string) => hasSectionPermission(section, 'edit'),
    [hasSectionPermission],
  );
  const canDelete = useCallback(
    (section: string) => hasSectionPermission(section, 'delete'),
    [hasSectionPermission],
  );

  const hasAnySectionPermission = useCallback(
    (sections: ReadonlyArray<string>, action: ActionType) =>
      sections.some((section) => hasSectionPermission(section, action)),
    [hasSectionPermission],
  );
  const hasAllSectionPermissions = useCallback(
    (sections: ReadonlyArray<string>, action: ActionType) =>
      sections.every((section) => hasSectionPermission(section, action)),
    [hasSectionPermission],
  );

  return {
    sectionPermissions,
    canRead,
    canEdit,
    canDelete,
    hasSectionPermission,
    hasAnySectionPermission,
    hasAllSectionPermissions,
  };
}
