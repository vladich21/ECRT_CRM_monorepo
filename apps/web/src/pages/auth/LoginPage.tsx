import { Button, Form, Alert, Image } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../../store/AuthStore';
import { authLoadingScreenStore } from '../../store/authLoadingScreenStore';
import { authApi } from '../../api/auth/authApi';
import type { User } from '../../types/user';
import {
  type FormValues,
  type LoginState,
  INITIAL_LOGIN_STATE,
  STEP_TITLES,
  STEP_BUTTON_LABELS,
} from './LoginPage.types';
import { LoginFormFields } from './LoginFormFields';
import styles from './LoginPage.module.scss';

function LoginPage() {
  const navigate = useNavigate();
  const storeLogin = useAuthStore((s) => s.login);
  const [form] = Form.useForm<FormValues>();
  const [state, setState] = useState<LoginState>(INITIAL_LOGIN_STATE);

  const set = (patch: Partial<LoginState>) => setState((prev) => ({ ...prev, ...patch }));

  const finish = (user: User | undefined) => {
    if (user) storeLogin(user);
    authLoadingScreenStore.showThenNavigate(() => navigate('/home'), 1000, 1500);
  };

  const handleBack = () => {
    const savedEmail = state.email;
    setState(INITIAL_LOGIN_STATE);
    form.resetFields();
    if (savedEmail) form.setFieldValue('email', savedEmail);
  };

  const handleSubmit = async (values: FormValues) => {
    set({ loading: true, error: '' });
    try {
      switch (state.step) {
        case 'login': {
          const data = await authApi.checkEmail(values.email!);
          set({ email: values.email!, step: data.tempCodeSent ? 'temp-code' : 'password', maskedEmail: data.email ?? '' });
          break;
        }
        case 'password': {
          const data = await authApi.verifyPassword(state.email, values.password!);
          if (data.awaiting2FA) set({ step: '2fa-code', maskedEmail: data.email ?? '' });
          else if (data.mustChangePassword) set({ step: 'set-password' });
          else finish(data.user);
          break;
        }
        case 'temp-code':
          await authApi.verifyTempCode(state.email, values.code!);
          set({ step: 'set-password' });
          break;
        case '2fa-code': {
          const data = await authApi.verify2fa(state.email, values.code!);
          finish(data.user);
          break;
        }
        case 'set-password': {
          const data = await authApi.setPassword(state.email, values.password!, values.confirmPassword!);
          finish(data.user);
          break;
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      set({ error: e.response?.data?.message ?? 'Ошибка подключения к серверу' });
    } finally {
      set({ loading: false });
    }
  };

  const showCodeHint = state.maskedEmail && (state.step === 'temp-code' || state.step === '2fa-code');

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <Image src="/logo.png" alt="Логотип" preview={false} width={160} />
          <h2>{STEP_TITLES[state.step]}</h2>
          {showCodeHint && <p className={styles.emailHint}>Код отправлен на {state.maskedEmail}</p>}
        </div>

        {state.error && (
          <Alert
            type="error"
            message={state.error}
            showIcon
            closable
            style={{ marginBottom: 24 }}
            onClose={() => set({ error: '' })}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <LoginFormFields step={state.step} email={state.email} onBack={handleBack} />
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" loading={state.loading} block>
              {STEP_BUTTON_LABELS[state.step]}
            </Button>
          </Form.Item>
        </Form>

        {state.step !== 'login' && (
          <Button type="link" block className={styles.backBtn} onClick={handleBack}>
            Назад
          </Button>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
