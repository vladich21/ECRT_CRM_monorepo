import { authApi } from './authApi';
import { useAuthStore } from '../../store/AuthStore';

export async function refreshSessionUser(): Promise<void> {
  const { user } = await authApi.getMe();
  useAuthStore.getState().login(user);
}
