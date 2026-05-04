import { authApi } from './authApi';
import { useAuthStore } from '../../store/AuthStore';

export async function refreshSessionUser(): Promise<void> {
  const { user, sectionPermissions } = await authApi.getMe();
  useAuthStore.getState().login(user, sectionPermissions);
}
