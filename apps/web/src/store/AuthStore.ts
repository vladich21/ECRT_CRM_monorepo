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

let markAuthHydrated = () => {};
let resetPermissionsAfterPersistRehydrate = () => {};

export type PermissionsBootstrapStatus = 'idle' | 'pending' | 'ready' | 'error';

interface IAuthStore {
  hasHydrated: boolean;
  user: User | null;
  isAuth: boolean;
  sectionPermissions: SectionPermission[];
  impersonation: ImpersonationContext | null;
  permissionsBootstrapStatus: PermissionsBootstrapStatus;
  setUserAfterCredentialLogin: (user: User) => void;
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
