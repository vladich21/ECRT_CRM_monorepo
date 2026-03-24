import type { User } from '../types/user';

/** ФИО для отображения (как в карточках). */
export function formatSrmUserName(user: Pick<User, 'last_name' | 'first_name' | 'middle_name'> | null | undefined): string {
  if (!user) return '—';
  const s = [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim();
  return s || '—';
}
