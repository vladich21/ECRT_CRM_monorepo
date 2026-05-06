import { App } from 'antd';
import type { ModalFuncProps } from 'antd/es/modal/interface';
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NavigateFunction } from 'react-router-dom';

import type { NotificationType } from '../useNotification';
import type { DeleteMutationFeedbackConfig } from './deleteMutationFeedback.types';
import { runDeleteMutationWithFeedbackAsync } from './runDeleteMutationWithFeedback';

export type OpenAntdDeleteConfirmConfig<TData, TError, TVariables> = {
  title?: ReactNode;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
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

function isMissingDeleteVariables<T>(v: T | null | undefined): boolean {
  if (v == null) return true;
  if (typeof v === 'string' && v === '') return true;
  return false;
}

export function getAntdDeleteConfirmModalProps<TData, TError, TVariables>(
  config: OpenAntdDeleteConfirmConfig<TData, TError, TVariables>,
): ModalFuncProps {
  return {
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
  };
}

/** Если нужен вызов вне React: передать `modal.confirm` из `App.useApp()`. */
export function openAntdDeleteConfirm<TData, TError, TVariables>(
  confirm: (props: ModalFuncProps) => void,
  config: OpenAntdDeleteConfirmConfig<TData, TError, TVariables>,
): void {
  confirm(getAntdDeleteConfirmModalProps(config));
}

/**
 * Предпочтительный способ: компонент должен быть внутри дерева с корневым `<App>` из antd (см. `main.jsx`).
 */
export function useOpenAntdDeleteConfirm() {
  const { modal } = App.useApp();

  return useCallback(
    <TData, TError, TVariables>(config: OpenAntdDeleteConfirmConfig<TData, TError, TVariables>) => {
      modal.confirm(getAntdDeleteConfirmModalProps(config));
    },
    [modal],
  );
}
