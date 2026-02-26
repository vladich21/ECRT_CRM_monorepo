import { notification } from 'antd';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

interface UseNotificationReturn {
  notificationApi: ReturnType<typeof notification.useNotification>[0];
  contextHolder: React.ReactElement;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
}

export const useNotification = (): UseNotificationReturn => {
  const [notificationApi, contextHolder] = notification.useNotification();

  const showNotification = (type: NotificationType, title: string, description?: string) => {
    notificationApi[type]({
      message: title,
      description,
    });
  };

  return {
    notificationApi,
    contextHolder,
    showNotification,
  };
};
