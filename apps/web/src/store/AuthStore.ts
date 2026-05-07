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

/** Колбэк markAuthHydrated вызывается из persist после merge — до этого PrivateRoute не редиректит на /auth */
let markAuthHydrated = () => {};
/** Сброс прав после merge из storage — через `set` из замыкания persist (нельзя вызывать `useAuthStore` до завершения `create`). */
let resetPermissionsAfterPersistRehydrate = () => {};

/** Загрузка snapshot прав с бэка (/auth/me). Пустой sectionPermissions при pending ≠ «нет прав». */
export type PermissionsBootstrapStatus = 'idle' | 'pending' | 'ready' | 'error';

interface IAuthStore {
  /** true после чтения persist из storage — до этого PrivateRoute не редиректит на /auth */
  hasHydrated: boolean;
  user: User | null;
  isAuth: boolean;
  sectionPermissions: SectionPermission[];
  impersonation: ImpersonationContext | null;
  /** idle — не авторизован; pending/error/ready — жизненный цикл загрузки snapshot через /auth/me (обрабатывает PrivateRoute) */
  permissionsBootstrapStatus: PermissionsBootstrapStatus;
  /** После verify-password / verify-2fa / set-password: пользователь есть, права подтянет PrivateRoute через /auth/me */
  setUserAfterCredentialLogin: (user: User) => void;
  /** После успешного GET /auth/me — полный снимок сессии */
  applySessionSnapshot: (
    user: User,
    sectionPermissions: SectionPermission[],
    impersonation: ImpersonationContext | null,
  ) => void;
  setPermissionsBootstrapStatus: (status: PermissionsBootstrapStatus) => void;
  setSectionPermissions: (permissions: SectionPermission[]) => void;
  setImpersonation: (impersonation: ImpersonationContext | null) => void;
  logout: () => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    set => {
      markAuthHydrated = () => set({ hasHydrated: true });
      resetPermissionsAfterPersistRehydrate = () =>
        set(state => ({
          sectionPermissions: [],
          impersonation: null,
          permissionsBootstrapStatus: state.isAuth ? ('pending' as PermissionsBootstrapStatus) : ('idle' as PermissionsBootstrapStatus),
        }));
      return {
        hasHydrated: false,
        user: null,
        isAuth: false,
        sectionPermissions: [],
        impersonation: null,
        permissionsBootstrapStatus: 'idle' as PermissionsBootstrapStatus,

        setUserAfterCredentialLogin: (user: User) =>
          set({
            user,
            isAuth: true,
            sectionPermissions: [],
            impersonation: null,
            permissionsBootstrapStatus: 'pending',
          }),

        applySessionSnapshot: (
          user: User,
          sectionPermissions: SectionPermission[],
          impersonation: ImpersonationContext | null,
        ) =>
          set({
            user,
            isAuth: true,
            sectionPermissions,
            impersonation,
            permissionsBootstrapStatus: 'ready',
          }),

        setPermissionsBootstrapStatus: (permissionsBootstrapStatus: PermissionsBootstrapStatus) =>
          set({ permissionsBootstrapStatus }),

        setSectionPermissions: (sectionPermissions: SectionPermission[]) =>
          set({ sectionPermissions }),

        setImpersonation: (impersonation: ImpersonationContext | null) =>
          set({ impersonation }),

        logout: () =>
          set({
            user: null,
            isAuth: false,
            sectionPermissions: [],
            impersonation: null,
            permissionsBootstrapStatus: 'idle',
          }),
      };
    },
    {
      name: 'auth-storage',
      // Не персистим snapshot прав — он живёт в JWT и подгружается через /auth/me.
      // Также не персистим impersonation: контекст приходит из /auth/me, актуален
      // только пока валиден токен.
      partialize: (state) => ({ user: state.user, isAuth: state.isAuth }),
      onRehydrateStorage: () => (_state, error) => {
        if (error) console.warn('auth-storage rehydrate failed', error);
        else {
          resetPermissionsAfterPersistRehydrate();
        }
        markAuthHydrated();
      },
    },
  ),
);

export default useAuthStore;
