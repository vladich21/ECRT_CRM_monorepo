import axios, { type AxiosError } from 'axios';

const getBaseApiUrl = (): string => import.meta.env.VITE_API_URL || '/api';

const getFileApiUrl = (): string => import.meta.env.VITE_FILE_URL || getBaseApiUrl();

export const BASE_API_URL = getBaseApiUrl();
export const FILE_API_URL = getFileApiUrl();

export const apiClient = axios.create({
  baseURL: BASE_API_URL,
  withCredentials: true,
});

export const fileClient = axios.create({
  baseURL: FILE_API_URL,
  withCredentials: true,
});

export const loginClient = apiClient;

let sessionTerminationStarted = false;

/** Один сценарий выхода: очистить cookie на сервере, затем localStorage и полный переход на форму входа. */
export function terminateSessionAndRedirect(): void {
  if (sessionTerminationStarted) return;
  sessionTerminationStarted = true;
  void apiClient
    .post('/auth/logout')
    .catch(() => {})
    .finally(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    });
}

function resolveRequestUrl(error: AxiosError): string {
  const cfg = error.config;
  if (!cfg) return '';
  const raw = cfg.url ?? '';
  try {
    return new URL(raw, cfg.baseURL || window.location.origin).href;
  } catch {
    return raw;
  }
}

/**
 * 401 files-service / чужого хоста / logout не означает «сессия PMDB мертва».
 * Иначе аватар или /api/v1/files/{uuid} сносит auth_token и кидает на /auth.
 */
export function shouldTerminateSessionOn401(error: AxiosError): boolean {
  if (error.response?.status !== 401) return false;
  const url = resolveRequestUrl(error);
  if (!url) return false;
  if (/\/auth\/logout(?:\?|$)/.test(url)) return false;
  if (/:3080\b/.test(url) || /\/api\/v1\/files\b/.test(url) || /\/(?:files|dl)\//.test(url)) {
    return false;
  }
  try {
    const requestOrigin = new URL(url).origin;
    const pageOrigin = typeof window !== 'undefined' ? window.location.origin : requestOrigin;
    if (requestOrigin !== pageOrigin) return false;
  } catch {
    return false;
  }
  return /\/auth\/me(?:\?|$)/.test(url);
}

apiClient.interceptors.request.use(config => {
  const isAuthRoute = config.url?.startsWith('/auth');
  if (!isAuthRoute && config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() ?? '')) {
    if (!(config.data instanceof FormData)) {
      config.data = { body: config.data };
    }
  }
  return config;
});

const onResponseError = (error: unknown) => {
  if (axios.isAxiosError(error) && shouldTerminateSessionOn401(error)) {
    terminateSessionAndRedirect();
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use(r => r, onResponseError);
fileClient.interceptors.response.use(r => r, onResponseError);
