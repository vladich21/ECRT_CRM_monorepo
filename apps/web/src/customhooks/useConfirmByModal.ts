import { useCallback, type ReactNode, type SyntheticEvent } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import type { ConfirmModalAppearance } from '../store/ModalStore';
import { ModalType, useModalStore } from '../store/ModalStore';
import type { DeleteMutationFeedbackConfig } from './confirmDelete/deleteMutationFeedback.types';
import { runDeleteMutationWithFeedback } from './confirmDelete/runDeleteMutationWithFeedback';
import { NotificationType } from './useNotification';

export { CONFIRM_MODAL_DEFAULT_REDIRECT_MS } from './confirmDelete/constants';

export type OpenConfirmModalOverrides = {
  title?: string;
  content?: ReactNode;
  okText?: string;
  cancelText?: string;
  confirmAppearance?: ConfirmModalAppearance;
};

interface UseDeleteOptions<TData = void, TError = Error, TVariables = string> {
  mutation: UseMutationResult<TData, TError, TVariables>;
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string;
  redirectPath?: string;
  redirectState?: unknown | ((data: TData) => unknown);
  redirectReplace?: boolean;
  redirectDelayMs?: number;
  modalType?: ModalType;
  defaultModalTitle?: string;
  getMutationProps: () => TVariables;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  onSuccess?: (data: TData) => void;
}
interface UseDeleteReturn {
  isOpenModal: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  handleOpenModal: (arg?: OpenConfirmModalOverrides | SyntheticEvent) => void;
  handleCloseModal: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}
export const useConfirmByModal = <TData = void, TError = Error, TVariables = string>({
  mutation,
  successMessage = 'Элемент успешно удалён',
  errorMessage = 'Не удалось удалить элемент',
  redirectPath,
  redirectState,
  redirectReplace = false,
  redirectDelayMs,
  modalType = 'confirm',
  defaultModalTitle = 'Вы уверены?',
  getMutationProps,
  showNotification,
  onSuccess,
}: UseDeleteOptions<TData, TError, TVariables>): UseDeleteReturn => {
  const navigate = useNavigate();
  const { openModal, closeModal, open: isOpenModal } = useModalStore();
  const { mutate, isPending, isSuccess, isError } = mutation;
  const handleCloseModal = useCallback(() => {
    closeModal();
  }, [closeModal]);
  const onCancel = useCallback(() => {
    closeModal();
  }, [closeModal]);
  const onConfirm = useCallback(() => {
    const mutationProps = getMutationProps();
    if (!mutationProps) {
      showNotification('error', 'Ошибка', 'ID не найден');
      return;
    }
    const feedback: DeleteMutationFeedbackConfig<TData> = {
      showNotification,
      successMessage: successMessage ?? 'Элемент успешно удалён',
      errorMessage,
      navigate,
      redirectPath,
      redirectState,
      redirectReplace,
      redirectDelayMs,
      onAfterSuccessNotification: closeModal,
      onMutationSuccess: onSuccess,
    };
    runDeleteMutationWithFeedback(mutate, mutationProps, feedback);
  }, [
    closeModal,
    errorMessage,
    getMutationProps,
    mutate,
    navigate,
    onSuccess,
    redirectDelayMs,
    redirectPath,
    redirectReplace,
    redirectState,
    showNotification,
    successMessage,
  ]);
  const handleOpenModal = (arg?: OpenConfirmModalOverrides | SyntheticEvent) => {
    const overrides =
      arg && typeof arg === 'object' && 'nativeEvent' in arg ? undefined : (arg as OpenConfirmModalOverrides | undefined);
    openModal({
      title: overrides?.title ?? defaultModalTitle,
      type: modalType,
      onConfirm,
      onCancel,
      loading: isPending || false,
      content: overrides?.content,
      okText: overrides?.okText,
      cancelText: overrides?.cancelText,
      confirmAppearance: overrides?.confirmAppearance,
    });
  };
  return {
    isOpenModal,
    isPending,
    isSuccess,
    isError,
    handleOpenModal,
    handleCloseModal,
    onConfirm,
    onCancel,
  };
};
