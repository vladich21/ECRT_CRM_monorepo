import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { User } from '../types/user';

interface IAuthStore {
  user: User | null;
  isAuth: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    set => ({
      user: null,
      isAuth: false,

      login: (user: User) => set({ user, isAuth: true }),

      logout: () => set({ user: null, isAuth: false }),
    }),
    { name: 'auth-storage' },
  ),
);

export default useAuthStore;
