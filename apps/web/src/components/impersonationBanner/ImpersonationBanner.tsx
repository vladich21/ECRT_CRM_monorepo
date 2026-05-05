import { useState } from 'react';
import { Button } from 'antd';
import { LogoutOutlined, UserSwitchOutlined } from '@ant-design/icons';

import { impersonationApi } from '../../api/impersonation/impersonationApi';
import { refreshSessionUser } from '../../api/auth/refreshSessionUser';
import { useNotification } from '../../customhooks/useNotification';
import useAuthStore from '../../store/AuthStore';
import styles from './ImpersonationBanner.module.scss';

export const IMPERSONATION_BANNER_HEIGHT = 32;

export function ImpersonationBanner() {
  const impersonation = useAuthStore(state => state.impersonation);
  const user = useAuthStore(state => state.user);
  const [loading, setLoading] = useState(false);
  const { contextHolder, showNotification } = useNotification();

  if (!impersonation) return null;

  const targetName =
    [user?.last_name, user?.first_name, user?.middle_name].filter(Boolean).join(' ').trim() ||
    user?.email ||
    'пользователя';

  const handleStop = async () => {
    setLoading(true);
    try {
      await impersonationApi.stop();
      await refreshSessionUser();
      showNotification('success', 'Возврат в свою сессию');
      // Перезагружаем приложение, чтобы сбросить кэш React Query/состояния таблиц
      // под другого пользователя.
      window.location.href = '/home';
    } catch (e) {
      const message =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Не удалось завершить сессию';
      showNotification('error', 'Ошибка', message);
      setLoading(false);
    }
  };

  return (
    <>
      {contextHolder}
      <div className={styles.banner} role='status' aria-live='polite'>
        <UserSwitchOutlined />
        <span className={styles.text}>
          Вы вошли как <strong>{targetName}</strong>. Администратор: {impersonation.adminName} ({impersonation.adminEmail})
        </span>
        <Button
          size='small'
          icon={<LogoutOutlined />}
          loading={loading}
          onClick={handleStop}
          className={styles.stopButton}
        >
          Вернуться в свою сессию
        </Button>
      </div>
    </>
  );
}
