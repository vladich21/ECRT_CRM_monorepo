import type { NavigateFunction } from 'react-router-dom';

import type { NotificationType } from '../useNotification';

/**
 * Общие побочные эффекты после delete/update-мутации через модалку подтверждения:
 * уведомления, опциональный редирект, колбэк после успеха (инвалидация кэша и т.д.).
 */
export type DeleteMutationFeedbackConfig<TData> = {
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  successMessage: string | ((data: TData) => string);
  errorMessage: string;
  navigate: NavigateFunction;
  redirectPath?: string;
  redirectState?: unknown | ((data: TData) => unknown);
  redirectReplace?: boolean;
  redirectDelayMs?: number;
  /**
   * Сразу после success-уведомления: закрытие глобальной модалки из ModalStore.
   * У Ant Design Modal.confirm ничего не передаём.
   */
  onAfterSuccessNotification?: () => void;
  /** Дополнительно к уведомлению (например invalidateQueries). */
  onMutationSuccess?: (data: TData) => void;
};
