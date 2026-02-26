import { User } from '../../../../types/user';

export const mapUsersForTable = (users: User[]) =>
  users.map(u => ({
    ...u,
    fio: [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ').trim() || '-',
  }));
