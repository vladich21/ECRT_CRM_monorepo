import type { ReactNode } from 'react';
import { Result } from 'antd';

import { usePermissions } from '../../hooks/usePermissions';
import type { ActionType, SectionCode } from '../../shared/permissions';

interface Props {
  /** Один раздел или список. Если список — достаточно прав хотя бы на один. */
  section?: SectionCode | string;
  sections?: ReadonlyArray<SectionCode | string>;
  action?: ActionType;
  children: ReactNode;
}

/**
 * Обертка маршрута: доступ по snapshot прав из стора (после PrivateRoute уже синхронизирован с /auth/me).
 */
export function RequireSection({ section, sections, action = 'read', children }: Props) {
  const { hasSectionPermission, hasAnySectionPermission } = usePermissions();

  const allowed = section
    ? hasSectionPermission(section, action)
    : sections && sections.length > 0
      ? hasAnySectionPermission(sections, action)
      : false;

  if (allowed) return <>{children}</>;

  return (
    <Result
      status='403'
      title='Нет доступа'
      subTitle='У вашей роли нет прав на этот раздел. Обратитесь к администратору.'
    />
  );
}
