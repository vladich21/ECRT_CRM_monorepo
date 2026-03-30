import { Modal } from 'antd';
import type { ReactNode } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

import type { NotificationType } from '../useNotification';
import type { DeleteMutationFeedbackConfig } from './deleteMutationFeedback.types';
import { runDeleteMutationWithFeedbackAsync } from './runDeleteMutationWithFeedback';

export type OpenAntdDeleteConfirmConfig<TData, TError, TVariables> = {
  /** По умолчанию совпадает с прежней глобальной ConfirmModal */
  title?: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  /** Для деструктивных действий (по умолчанию true) */
  danger?: boolean;
  mutation: UseMutationResult<TData, TError, TVariables>;
  getVariables: () => TVariables | null | undefined;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  successMessage: string | ((data: TData) => string);
  errorMessage: string;
  navigate: NavigateFunction;
  redirectPath?: string;
  redirectState?: unknown | ((data: TData) => unknown);
  redirectReplace?: boolean;
  redirectDelayMs?: number;
  onMutationSuccess?: (data: TData) => void;
  missingVariablesMessage?: string;
};

/**
 * Удаление/подтверждение через Ant Design `Modal.confirm` вместо глобального ModalStore.
 * Удобно для списков и контекстных меню: не дублирует разметку корневой модалки.
 */
export function openAntdDeleteConfirm<TData, TError, TVariables>(
  config: OpenAntdDeleteConfirmConfig<TData, TError, TVariables>,
): void {
  Modal.confirm({
    title: config.title ?? 'Вы уверены?',
    content: config.content,
    okText: config.okText ?? 'Удалить',
    cancelText: config.cancelText ?? 'Отмена',
    okButtonProps: config.danger === false ? undefined : { danger: true },
    onOk: () => {
      const variables = config.getVariables();
      if (isMissingDeleteVariables(variables)) {
        config.showNotification('error', 'Ошибка', config.missingVariablesMessage ?? 'ID не найден');
        return Promise.reject(new Error('MISSING_VARIABLES'));
      }
      const feedback: DeleteMutationFeedbackConfig<TData> = {
        showNotification: config.showNotification,
        successMessage: config.successMessage,
        errorMessage: config.errorMessage,
        navigate: config.navigate,
        redirectPath: config.redirectPath,
        redirectState: config.redirectState,
        redirectReplace: config.redirectReplace,
        redirectDelayMs: config.redirectDelayMs,
        onMutationSuccess: config.onMutationSuccess,
      };
      return runDeleteMutationWithFeedbackAsync(config.mutation, variables as TVariables, feedback);
    },
  });
}

function isMissingDeleteVariables<T>(v: T | null | undefined): boolean {
  if (v == null) return true;
  if (typeof v === 'string' && v === '') return true;
  return false;
}
