import { useCallback, useEffect, useRef } from 'react';
import { notification } from 'antd';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface UseNotificationReturn {
  notificationApi: ReturnType<typeof notification.useNotification>[0];
  contextHolder: React.ReactElement;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [notificationApi, contextHolder] = notification.useNotification();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, description?: string) => {
      if (!isMountedRef.current) return;
      notificationApi[type]({
        message: title,
        description,
      });
    },
    [notificationApi],
  );

  return {
    notificationApi,
    contextHolder,
    showNotification,
  };
};
