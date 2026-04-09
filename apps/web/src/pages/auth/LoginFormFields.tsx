import { Button, Form, Input } from 'antd';

import styles from './LoginPage.module.scss';
import type { Step } from './LoginPage.types';

type Props = {
  step: Step;
  email: string;
  onBack: () => void;
};

const digitsOnly = (value: string) => value.replace(/\D/g, '');

const confirmMatchRule = ({ getFieldValue }: { getFieldValue: (field: string) => string }) => ({
  validator(_: unknown, value: string) {
    const passwordsMatch = !value || getFieldValue('password') === value;
    return passwordsMatch ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают'));
  },
});

export function LoginFormFields({ step, email, onBack }: Props) {
  if (step === 'login') {
    return (
      <Form.Item
        label='Email'
        name='email'
        rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}
      >
        <Input placeholder='ivan.petrov@ecrt.ru' size='large' autoFocus autoComplete='email' />
      </Form.Item>
    );
  }

  if (step === 'password') {
    return (
      <>
        <div className={styles.loginRow}>
          <span>{email}</span>
          <Button type='link' size='small' onClick={onBack} style={{ padding: 0 }}>
            Изменить
          </Button>
        </div>
        <Form.Item label='Пароль' name='password' rules={[{ required: true, message: 'Введите пароль' }]}>
          <Input.Password placeholder='Ваш пароль' size='large' autoFocus autoComplete='current-password' />
        </Form.Item>
      </>
    );
  }

  if (step === 'temp-code' || step === '2fa-code') {
    const codeLabel = step === '2fa-code' ? null : '6-значный код';
    return (
      <>
        {step === '2fa-code' && (
          <p className={styles.codeHint}>
            Введите 6-значный код подтверждения, отправленный на вашу почту
          </p>
        )}
        <Form.Item
          className={step === '2fa-code' ? styles.codeFormItem : undefined}
          label={codeLabel ?? undefined}
          name='code'
          normalize={digitsOnly}
          rules={[
            { required: true, message: 'Введите код' },
            { len: 6, message: 'Код состоит из 6 цифр' },
          ]}
        >
          {step === '2fa-code' ? (
            <Input.OTP
              length={6}
              formatter={value => (/\d/.test(value) ? value : '')}
              autoFocus
              className={styles.codeOtp}
            />
          ) : (
            <Input className={styles.codeInput} placeholder='000000' size='large' maxLength={6} autoFocus />
          )}
        </Form.Item>
      </>
    );
  }

  if (step === 'set-password') {
    return (
      <>
        <p className={styles.passwordHint}>Минимум 10 символов, 1 заглавная буква, 1 цифра.</p>
        <Form.Item
          label='Новый пароль'
          name='password'
          rules={[
            { required: true, message: 'Введите пароль' },
            { min: 10, message: 'Минимум 10 символов' },
          ]}
        >
          <Input.Password placeholder='Минимум 10 символов' size='large' autoFocus autoComplete='new-password' />
        </Form.Item>
        <Form.Item
          label='Подтвердите пароль'
          name='confirmPassword'
          dependencies={['password']}
          rules={[{ required: true, message: 'Подтвердите пароль' }, confirmMatchRule]}
        >
          <Input.Password placeholder='Повторите пароль' size='large' autoComplete='new-password' />
        </Form.Item>
      </>
    );
  }

  return null;
}
