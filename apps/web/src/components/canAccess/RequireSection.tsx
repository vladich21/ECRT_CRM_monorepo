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
 * Обёртка для маршрута: показывает страницу только при наличии прав.
 * Иначе — экран «Нет доступа» (без редиректа, чтобы пользователь видел
 * причину; если редирект нужен — обернуть с <Navigate />).
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
