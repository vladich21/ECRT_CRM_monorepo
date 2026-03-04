import { User } from '../../types/user';

export const userUpdateFormMapper = (userData: User) => {
  const values = {
    last_name: userData.last_name || '',
    first_name: userData.first_name || '',
    middle_name: userData.middle_name || '',
    email: userData.email || '',
    phone: userData.phone || '',
    internal_phone: (userData as any).internal_phone || '',
    department_id: userData.department?.id != null && userData.department.id !== '' ? String(userData.department.id) : undefined,
    position_id: userData.position?.id != null && userData.position.id !== '' ? String(userData.position.id) : undefined,
    workplace_id: (userData as any).workplace_id || null,
    role_ids: userData.roles?.map(role => String(role.id)) || [],
    is_active: userData.is_active ?? true,
  };
  return values;
};
