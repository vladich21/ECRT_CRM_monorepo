import axios from 'axios';
import Cookies from 'js-cookie';

const getBaseApiUrl = (): string => import.meta.env.VITE_API_URL || 'http://192.0.2.11:9001/api';

const getAuthApiUrl = (): string =>
  import.meta.env.VITE_AUTH_URL || 'http://192.0.2.11:8002';

const getFileApiUrl = (): string =>
  import.meta.env.VITE_FILE_URL || 'http://192.0.2.11:9003/api';

const getNewApiUrl = (): string => {
  if (import.meta.env.PROD) return getBaseApiUrl() || '/api';
  return 'http://192.0.2.20:5001/api';
};

export const BASE_API_URL = getBaseApiUrl();
export const AUTH_API_URL = getAuthApiUrl();
export const FILE_API_URL = getFileApiUrl();
export const NEW_API_URL = getNewApiUrl();

export const apiClient = axios.create({
  baseURL: BASE_API_URL,
});

export const newApiClient = axios.create({
  baseURL: NEW_API_URL,
});

export const loginClient = axios.create({
  baseURL: AUTH_API_URL,
});

export const fileClient = axios.create({
  baseURL: FILE_API_URL,
});

// Добавляем токен в заголовки api
apiClient.interceptors.request.use(config => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Не оборачиваем FormData в { body: ... }, так как это multipart/form-data
  if (config.data && ['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
    if (!(config.data instanceof FormData)) {
      config.data = { body: config.data };
    }
  }
  return config;
});

// Обрабатываем ошибки авторизации
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    }

    const apiError = {
      message: error.response?.data?.message || error.message || 'Произошла ошибка',
      status: error.response?.status,
      data: error.response?.data,
      code: error.response?.data?.code,
    };

    return Promise.reject(apiError);
  },
);

// Добавляем токен в заголовки file
fileClient.interceptors.request.use(config => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обрабатываем ошибки авторизации
fileClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    }

    const apiError = {
      message: error.response?.data?.message || error.message || 'Произошла ошибка',
      status: error.response?.status,
      data: error.response?.data,
      code: error.response?.data?.code,
    };

    return Promise.reject(apiError);
  },
);
