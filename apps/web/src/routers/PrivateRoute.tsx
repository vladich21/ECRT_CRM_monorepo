import { ReactNode, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';

import { refreshSessionUser } from '../api/auth/refreshSessionUser';
import { Loader } from '../components/loader/Loader';
import useAuthStore from '../store/AuthStore';

const RETRY_INTERVAL_MS = 2500;

/**
 * Защита приватной зоны: cookie-сессия + GET /auth/me для прав.
 * При временных сбоях — тихий повтор без экрана ошибки.
 */
const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const isAuth = useAuthStore(state => state.isAuth);
  const permissionsBootstrapStatus = useAuthStore(state => state.permissionsBootstrapStatus);
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHydrated || !isAuth) return;
    if (permissionsBootstrapStatus === 'ready') return;

    let cancelled = false;

    const runRefresh = () => {
      void refreshSessionUser().catch(() => {
        if (cancelled || useAuthStore.getState().permissionsBootstrapStatus === 'ready') return;
        retryTimerRef.current = window.setTimeout(runRefresh, RETRY_INTERVAL_MS);
      });
    };

    runRefresh();

    return () => {
      cancelled = true;
      if (retryTimerRef.current != null) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [hasHydrated, isAuth, permissionsBootstrapStatus]);

  if (!hasHydrated) {
    return <Loader />;
  }

  if (!isAuth) {
    return <Navigate to='/auth' replace />;
  }

  if (permissionsBootstrapStatus !== 'ready') {
    return <Loader />;
  }

  return <>{children}</>;
};

export default PrivateRoute;
