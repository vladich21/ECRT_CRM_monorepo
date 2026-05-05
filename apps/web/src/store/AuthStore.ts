import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { User } from '../types/user';
import type { SectionPermission } from '../shared/permissions';

export interface ImpersonationContext {
  active: true;
  adminId: string;
  adminName: string;
  adminEmail: string;
}

interface IAuthStore {
  user: User | null;
  isAuth: boolean;
  sectionPermissions: SectionPermission[];
  impersonation: ImpersonationContext | null;
  login: (
    user: User,
    sectionPermissions?: SectionPermission[],
    impersonation?: ImpersonationContext | null,
  ) => void;
  setSectionPermissions: (permissions: SectionPermission[]) => void;
  setImpersonation: (impersonation: ImpersonationContext | null) => void;
  logout: () => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    set => ({
      user: null,
      isAuth: false,
      sectionPermissions: [],
      impersonation: null,

      login: (
        user: User,
        sectionPermissions: SectionPermission[] = [],
        impersonation: ImpersonationContext | null = null,
      ) => set({ user, isAuth: true, sectionPermissions, impersonation }),

      setSectionPermissions: (sectionPermissions: SectionPermission[]) =>
        set({ sectionPermissions }),

      setImpersonation: (impersonation: ImpersonationContext | null) =>
        set({ impersonation }),

      logout: () => set({ user: null, isAuth: false, sectionPermissions: [], impersonation: null }),
    }),
    {
      name: 'auth-storage',
      // Не персистим snapshot прав — он живёт в JWT и подгружается через /auth/me.
      // Также не персистим impersonation: контекст приходит из /auth/me, актуален
      // только пока валиден токен.
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth }),
    },
  ),
);

export default useAuthStore;
