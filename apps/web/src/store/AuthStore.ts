import { create } from "zustand";
import { User } from "../types/user";
import { persist } from "zustand/middleware";

interface IAuthStore {
  user: User | null
  token: string | null
  isAuth: boolean

  login: (user: User, token: string) => void
  logout: () => void
}

export const useAuthStore = create<IAuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuth: false,

      login: (user: User, token: string) =>
        set({ user, token, isAuth: true }),

      logout: () =>
        set({ user: null, token: null, isAuth: false }),
    }),
    { name: 'auth-storage' }
  )
);

export default useAuthStore;
