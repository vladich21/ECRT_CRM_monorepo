import { useState } from 'react';
import { Alert, Button, Form, message } from 'antd';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../../api/auth/authApi';
import { getApiErrorMessage } from '../../customhooks/confirmDelete/getApiErrorMessage';
import ecrtLogoMain from '../../assets/svg/ecrt-logo-main.svg';
import { authLoadingScreenStore } from '../../store/authLoadingScreenStore';
import { useAuthStore } from '../../store/AuthStore';
import type { User } from '../../types/user';
import { LoginFormFields } from './LoginFormFields';
import styles from './LoginPage.module.scss';
import {
  INITIAL_LOGIN_STATE,
  STEP_BUTTON_LABELS,
  STEP_TITLES,
  type FormValues,
  type LoginState,
} from './LoginPage.types';

const STEP_PROGRESS: Record<LoginState['step'], number> = {
  login: 1,
  password: 2,
  'temp-code': 3,
  'set-password': 3,
  '2fa-code': 2,
};

function LoginPage() {
  const navigate = useNavigate();
  const storeLogin = useAuthStore(s => s.login);
  const [form] = Form.useForm<FormValues>();
  const [state, setState] = useState<LoginState>(INITIAL_LOGIN_STATE);
  const [resendingCode, setResendingCode] = useState(false);
  const set = (patch: Partial<LoginState>) => setState(prev => ({ ...prev, ...patch }));
  const finish = (user: User | undefined) => {
    if (user) storeLogin(user);
    authLoadingScreenStore.showThenNavigate(() => navigate('/home'), 1000, 1500);
  };
  const handleBack = () => {
    if (state.step === '2fa-code') {
      set({ step: 'password', error: '' });
      form.resetFields();
      return;
    }

    const savedEmail = state.email;
    setState(INITIAL_LOGIN_STATE);
    form.resetFields();
    if (savedEmail) form.setFieldValue('email', savedEmail);
  };
  const handleSubmit = async (values: FormValues) => {
    set({ loading: true, error: '' });
    // На финальных шагах (после success → navigate) loading НЕ сбрасываем,
    // иначе кнопка успеет стать активной за 1с до перехода и пользователь
    // успеет нажать повторно — backend получит пачку дубликатов set-password.
    let keepLoading = false;
    try {
      switch (state.step) {
        case 'login': {
          const data = await authApi.checkEmail(values.email!);
          set({
            email: values.email!,
            step: data.tempCodeSent ? 'temp-code' : 'password',
            maskedEmail: data.email ?? '',
          });
          break;
        }
        case 'password': {
          const data = await authApi.verifyPassword(state.email, values.password!);
          if (data.awaiting2FA) set({ step: '2fa-code', maskedEmail: data.email ?? '' });
          else if (data.mustChangePassword) set({ step: 'set-password' });
          else {
            finish(data.user);
            keepLoading = true;
          }
          break;
        }
        case 'temp-code':
          await authApi.verifyTempCode(state.email, values.code!);
          set({ step: 'set-password' });
          break;
        case '2fa-code': {
          const data = await authApi.verify2fa(state.email, values.code!);
          finish(data.user);
          keepLoading = true;
          break;
        }
        case 'set-password': {
          const data = await authApi.setPassword(state.email, values.password!, values.confirmPassword!);
          finish(data.user);
          keepLoading = true;
          break;
        }
      }
    } catch (err: unknown) {
      const fromBody = getApiErrorMessage(err);
      const hasResponse =
        err && typeof err === 'object' && 'response' in err && (err as { response?: unknown }).response != null;
      const fallback = hasResponse ? 'Не удалось выполнить запрос. Попробуйте ещё раз.' : 'Ошибка подключения к серверу';
      set({ error: fromBody ?? fallback });
    } finally {
      if (!keepLoading) set({ loading: false });
    }
  };
  const canResendCode = state.step === 'temp-code' || state.step === '2fa-code';
  const isCodeStep = state.step === 'temp-code' || state.step === '2fa-code';
  const handleResendCode = async () => {
    if (!canResendCode || !state.email || resendingCode) return;
    const resendStep = state.step;
    if (resendStep !== 'temp-code' && resendStep !== '2fa-code') return;
    setResendingCode(true);
    try {
      const data = await authApi.resendCode(state.email, resendStep);
      set({ maskedEmail: data.email ?? state.maskedEmail, error: '' });
      message.success('Код отправлен повторно');
    } catch (err: unknown) {
      set({ error: getApiErrorMessage(err) ?? 'Не удалось отправить код повторно' });
    } finally {
      setResendingCode(false);
    }
  };
  const showCodeHint = isCodeStep && Boolean(state.email);
  const activeStep = STEP_PROGRESS[state.step];
  return (
    <div className={styles.page}>
      <div className={`${styles.card} ${isCodeStep ? styles.codeCard : ''}`}>
        <div className={styles.header}>
          <div className={styles.steps} aria-hidden='true'>
            {[1, 2, 3].map(step => (
              <div
                key={step}
                className={`${styles.stepDot} ${step < activeStep ? styles.completed : ''} ${step === activeStep ? styles.active : ''}`}
              />
            ))}
          </div>
          <img src={ecrtLogoMain} alt='Логотип ИЦЖТ' className={styles.logo} />
          <h2>{STEP_TITLES[state.step]}</h2>
          {showCodeHint && <p className={styles.emailHint}>Код отправлен на {state.email}</p>}
        </div>

        {state.error && (
          <Alert
            type='error'
            message={state.error}
            showIcon
            closable
            style={{ marginBottom: 24 }}
            onClose={() => set({ error: '' })}
          />
        )}

        <Form form={form} layout='vertical' onFinish={handleSubmit} className={isCodeStep ? styles.codeForm : undefined}>
          <LoginFormFields step={state.step} email={state.email} onBack={handleBack} />
          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type='primary'
              htmlType='submit'
              size='large'
              loading={state.loading}
              block
              className={isCodeStep ? styles.codeSubmitBtn : ''}
            >
              {STEP_BUTTON_LABELS[state.step]}
            </Button>
          </Form.Item>
          {canResendCode && (
            <Button type='link' block className={styles.resendBtn} onClick={handleResendCode} loading={resendingCode}>
              Отправить код повторно
            </Button>
          )}
        </Form>

        {state.step !== 'login' && (
          <Button type='link' block className={styles.backBtn} onClick={handleBack}>
            ← Назад
          </Button>
        )}
      </div>
    </div>
  );
}
export default LoginPage;
