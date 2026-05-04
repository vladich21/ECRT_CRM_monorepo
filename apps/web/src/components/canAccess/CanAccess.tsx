import type { ReactNode } from 'react';

import { usePermissions } from '../../hooks/usePermissions';
import type { ActionType, SectionCode } from '../../shared/permissions';

interface CanAccessSingleProps {
  section: SectionCode | string;
  sections?: never;
  action?: ActionType;
  fallback?: ReactNode;
  children: ReactNode;
}

interface CanAccessAnyProps {
  section?: never;
  sections: ReadonlyArray<SectionCode | string>;
  action?: ActionType;
  fallback?: ReactNode;
  children: ReactNode;
}

type Props = CanAccessSingleProps | CanAccessAnyProps;

/**
 * Декларативная проверка доступа: рендерит children, если у пользователя
 * есть указанное право, иначе fallback.
 *
 * Один раздел:
 *   <CanAccess section={SECTIONS.PARTNERS_LIST} action="edit">…</CanAccess>
 *
 * Несколько разделов (хотя бы один из них даёт право):
 *   <CanAccess sections={[SECTIONS.A, SECTIONS.B]} action="read">…</CanAccess>
 */
export function CanAccess({ section, sections, action = 'read', fallback = null, children }: Props) {
  const { hasSectionPermission, hasAnySectionPermission } = usePermissions();

  const allowed = section
    ? hasSectionPermission(section, action)
    : hasAnySectionPermission(sections!, action);

  return <>{allowed ? children : fallback}</>;
}
