export type Step = 'login' | 'password' | 'temp-code' | 'set-password' | '2fa-code';

export type FormValues = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  code?: string;
};

export type LoginState = {
  step: Step;
  email: string;
  maskedEmail: string;
  loading: boolean;
  error: string;
};

export const INITIAL_LOGIN_STATE: LoginState = {
  step: 'login',
  email: '',
  maskedEmail: '',
  loading: false,
  error: '',
};

export const STEP_TITLES: Record<Step, string> = {
  login: 'Войти в PMDB',
  password: 'Введите пароль',
  'temp-code': 'Код подтверждения',
  'set-password': 'Установка пароля',
  '2fa-code': 'Двухфакторная аутентификация',
};

export const STEP_BUTTON_LABELS: Record<Step, string> = {
  login: 'Продолжить',
  password: 'Войти',
  'temp-code': 'Подтвердить',
  'set-password': 'Установить пароль и войти',
  '2fa-code': 'Подтвердить',
};
