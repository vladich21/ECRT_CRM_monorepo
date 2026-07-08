import { User } from '@/types/user';

export const mapUsersForTable = (users: User[]) =>
  users.map(user => ({
    ...user,
    fio: [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim() || '-',
  }));
