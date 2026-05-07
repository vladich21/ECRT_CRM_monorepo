import axios from 'axios';

import { terminateSessionAndRedirect } from '../clients';
import { authApi } from './authApi';
import { useAuthStore } from '../../store/AuthStore';

export async function refreshSessionUser(): Promise<void> {
  const { isAuth, permissionsBootstrapStatus } = useAuthStore.getState();
  if (!isAuth) return;

  if (permissionsBootstrapStatus !== 'ready') {
    useAuthStore.getState().setPermissionsBootstrapStatus('pending');
  }

  try {
    const { user, sectionPermissions, impersonation } = await authApi.getMe();
    useAuthStore.getState().applySessionSnapshot(user, sectionPermissions, impersonation ?? null);
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      terminateSessionAndRedirect();
      return;
    }
    useAuthStore.getState().setPermissionsBootstrapStatus('error');
    throw new Error('refreshSessionUser: GET /auth/me failed');
  }
}
