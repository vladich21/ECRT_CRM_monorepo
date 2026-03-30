import { APP_COLOR_ERROR, APP_COLOR_SUCCESS, APP_COLOR_WARNING } from './constants/appColors';

/** Токены Ant Design: совпадают с цветами приложения. */
export const antdThemeToken = {
  colorError: APP_COLOR_ERROR,
  colorWarning: APP_COLOR_WARNING,
  colorSuccess: APP_COLOR_SUCCESS,
} as const;
