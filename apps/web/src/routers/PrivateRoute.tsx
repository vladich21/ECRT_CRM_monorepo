import { ReactNode, useEffect, useState } from 'react';
import { Button, Result } from 'antd';
import { Navigate } from 'react-router-dom';

import { refreshSessionUser } from '../api/auth/refreshSessionUser';
import { Loader } from '../components/loader/Loader';
import useAuthStore from '../store/AuthStore';

/**
 * Защита приватной зоны: cookie-сессия есть, но snapshot прав живёт в JWT и
 * подтягивается через GET /auth/me (не кладём его в localStorage — см. AuthStore).
 * Пока первый запрос не завершён — общий лоадер; ошибка — один экран «Повторить».
 * Дочерние маршруты и RequireSection могут считать: при isAuth здесь права уже в сторе (ready).
 */
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const isAuth = useAuthStore(state => state.isAuth);
  const permissionsBootstrapStatus = useAuthStore(state => state.permissionsBootstrapStatus);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!hasHydrated || !isAuth) return;
    if (permissionsBootstrapStatus === 'pending') {
      void refreshSessionUser().catch(() => {});
    }
  }, [hasHydrated, isAuth, permissionsBootstrapStatus]);

  if (!hasHydrated) {
    return <Loader />;
  }

  if (!isAuth) {
    return <Navigate to='/auth' replace />;
  }

  if (permissionsBootstrapStatus === 'pending') {
    return <Loader />;
  }

  if (permissionsBootstrapStatus === 'error') {
    return (
      <Result
        status='warning'
        title='Не удалось загрузить права доступа'
        subTitle='Проверьте соединение и попробуйте снова.'
        extra={
          <Button
            type='primary'
            loading={retrying}
            onClick={() => {
              setRetrying(true);
              void refreshSessionUser().finally(() => setRetrying(false));
            }}
          >
            Повторить
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
};

export default PrivateRoute;
