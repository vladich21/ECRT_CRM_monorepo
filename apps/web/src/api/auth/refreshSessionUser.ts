import axios from 'axios';

import { terminateSessionAndRedirect } from '../clients';
import { authApi } from './authApi';
import { useAuthStore } from '../../store/AuthStore';

const SESSION_EXPIRED_STATUSES = new Set([401, 403]);
const RETRY_DELAYS_MS = [300, 800, 1500, 2500];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });
}

function isRetryableMeError(err: unknown): boolean {
  if (!axios.isAxiosError(err)) return false;
  if (err.response?.status && SESSION_EXPIRED_STATUSES.has(err.response.status)) return false;
  return !err.response || err.response.status >= 500;
}

let refreshInFlight: Promise<void> | null = null;

export async function refreshSessionUser(): Promise<void> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const { isAuth, permissionsBootstrapStatus } = useAuthStore.getState();
    if (!isAuth) return;

    const wasReady = permissionsBootstrapStatus === 'ready';
    if (!wasReady) {
      useAuthStore.getState().setPermissionsBootstrapStatus('pending');
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const { user, sectionPermissions, impersonation } = await authApi.getMe();
        useAuthStore.getState().applySessionSnapshot(user, sectionPermissions, impersonation ?? null);
        return;
      } catch (err) {
        lastError = err;

        if (axios.isAxiosError(err) && err.response?.status && SESSION_EXPIRED_STATUSES.has(err.response.status)) {
          terminateSessionAndRedirect();
          return;
        }

        if (attempt < RETRY_DELAYS_MS.length && isRetryableMeError(err)) {
          await sleep(RETRY_DELAYS_MS[attempt]);
          continue;
        }

        break;
      }
    }

    // Не сбрасываем ready-сессию из-за временного сбоя; PrivateRoute сам повторит запрос.
    if (!wasReady) {
      useAuthStore.getState().setPermissionsBootstrapStatus('pending');
    }

    throw lastError instanceof Error ? lastError : new Error('refreshSessionUser: GET /auth/me failed');
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}
