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

/** Сессия жива, пока /auth/me отвечает не 401. Остальные 401 (файлы, контракты) не логинят. */
export function shouldTerminateSessionOn401(error: AxiosError): boolean {
  if (error.response?.status !== 401) return false;
  const url = `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`;
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
