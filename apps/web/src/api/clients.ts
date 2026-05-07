import axios from 'axios';

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

/** Один сценарий выхода: очистить cookie на сервере, затем localStorage и полный переход на форму входа. */
export function terminateSessionAndRedirect(): void {
  void apiClient
    .post('/auth/logout')
    .catch(() => {})
    .finally(() => {
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    });
}

const handleUnauthorized = () => {
  terminateSessionAndRedirect();
};

apiClient.interceptors.request.use(config => {
  const isAuthRoute = config.url?.startsWith('/auth');
  if (!isAuthRoute && config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() ?? '')) {
    if (!(config.data instanceof FormData)) {
      config.data = { body: config.data };
    }
  }
  return config;
});

const onResponseError = (error: { config?: { url?: string }; response?: { status?: number } }) => {
  const isAuthRequest = error.config?.url?.startsWith('/auth');
  if (error.response?.status === 401 && !isAuthRequest) {
    handleUnauthorized();
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use(r => r, onResponseError);
fileClient.interceptors.response.use(r => r, onResponseError);
