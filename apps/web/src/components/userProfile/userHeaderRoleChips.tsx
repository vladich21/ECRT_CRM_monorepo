import type { ReactNode } from 'react';

import type { User } from '../../types/user';
import pi from '../pageLayout/profileInfoCards.module.scss';

export function userHeaderRoleChips(user: User): ReactNode[] | undefined {
  if (!user.roles?.length) return undefined;
  return user.roles.map(role => (
    <span
      key={role.id}
      className={role.role_name === 'admin' ? pi.roleChipHeaderAdmin : pi.roleChipHeader}
    >
      {role.role_name}
    </span>
  ));
}
