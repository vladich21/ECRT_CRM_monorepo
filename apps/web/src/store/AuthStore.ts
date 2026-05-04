import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { User } from '../types/user';
import type { SectionPermission } from '../shared/permissions';

interface IAuthStore {
  user: User | null;
  isAuth: boolean;
  sectionPermissions: SectionPermission[];
  login: (user: User, sectionPermissions?: SectionPermission[]) => void;
  setSectionPermissions: (permissions: SectionPermission[]) => void;
  logout: () => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    set => ({
      user: null,
      isAuth: false,
      sectionPermissions: [],

      login: (user: User, sectionPermissions: SectionPermission[] = []) =>
        set({ user, isAuth: true, sectionPermissions }),

      setSectionPermissions: (sectionPermissions: SectionPermission[]) =>
        set({ sectionPermissions }),

      logout: () => set({ user: null, isAuth: false, sectionPermissions: [] }),
    }),
    {
      name: 'auth-storage',
      // Не персистим snapshot прав — он живёт в JWT и подгружается через /auth/me.
      // Это защищает от ситуации, когда права в БД изменились, а в localStorage —
      // старые: пользователь увидит элементы UI, к которым уже нет доступа,
      // и сервер вернёт 403. Свежие права гарантированно приходят из бэкенда.
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth }),
    },
  ),
);

export default useAuthStore;
