import type { UseMutationResult } from '@tanstack/react-query';

import { CONFIRM_MODAL_DEFAULT_REDIRECT_MS } from './constants';
import type { DeleteMutationFeedbackConfig } from './deleteMutationFeedback.types';
import { getApiErrorMessage } from './getApiErrorMessage';

type MutateFn<TData, TError, TVariables> = UseMutationResult<TData, TError, TVariables>['mutate'];

/**
 * Единая точка: mutate + уведомления + опциональный редирект + колбэки.
 * Используется и глобальной ConfirmModal (useConfirmByModal), и Ant Design Modal.confirm.
 */
export function runDeleteMutationWithFeedback<TData, TError, TVariables>(
  mutate: MutateFn<TData, TError, TVariables>,
  variables: TVariables,
  feedback: DeleteMutationFeedbackConfig<TData>,
): void {
  mutate(variables, {
    onSuccess: data => applySuccessPath(data, feedback),
    onError: error => applyErrorPath(error, feedback),
  });
}

/**
 * Тот же сценарий, но с Promise для `Modal.confirm({ onOk: () => promise })` -
 * пока запрос не завершится, кнопка остается в loading.
 */
export function runDeleteMutationWithFeedbackAsync<TData, TError, TVariables>(
  mutation: UseMutationResult<TData, TError, TVariables>,
  variables: TVariables,
  feedback: DeleteMutationFeedbackConfig<TData>,
): Promise<TData> {
  return new Promise<TData>((resolve, reject) => {
    mutation.mutate(variables, {
      onSuccess: data => {
        applySuccessPath(data, feedback);
        resolve(data);
      },
      onError: error => {
        applyErrorPath(error, feedback);
        reject(error);
      },
    });
  });
}

function applySuccessPath<TData>(data: TData, feedback: DeleteMutationFeedbackConfig<TData>): void {
  const message =
    typeof feedback.successMessage === 'function' ? feedback.successMessage(data) : feedback.successMessage;
  feedback.showNotification('success', 'Успех', message);
  feedback.onAfterSuccessNotification?.();
  feedback.onMutationSuccess?.(data);
  if (feedback.redirectPath) {
    const delay = feedback.redirectDelayMs ?? CONFIRM_MODAL_DEFAULT_REDIRECT_MS;
    window.setTimeout(() => {
      const nextState =
        typeof feedback.redirectState === 'function' ? feedback.redirectState(data) : feedback.redirectState;
      feedback.navigate(feedback.redirectPath!, {
        replace: feedback.redirectReplace,
        ...(nextState !== undefined ? { state: nextState } : {}),
      });
    }, delay);
  }
}

function applyErrorPath<TData>(error: unknown, feedback: DeleteMutationFeedbackConfig<TData>): void {
  const apiMessage = getApiErrorMessage(error);
  feedback.showNotification('error', 'Ошибка', apiMessage ?? feedback.errorMessage);
}
