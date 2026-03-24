import { useCallback } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { ModalType, useModalStore } from '../store/ModalStore';
import { NotificationType } from './useNotification';

export const CONFIRM_MODAL_DEFAULT_REDIRECT_MS = 1000;
interface UseDeleteOptions<TData = void, TError = Error, TVariables = string> {
  mutation: UseMutationResult<TData, TError, TVariables>;
  successMessage?: string | ((data: TData) => string);
  errorMessage?: string;
  redirectPath?: string;
  redirectState?: unknown | ((data: TData) => unknown);
  redirectReplace?: boolean;
  redirectDelayMs?: number;
  modalType?: ModalType;
  getMutationProps: () => TVariables;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  onSuccess?: (data: TData) => void;
}
interface UseDeleteReturn {
  isOpenModal: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}
interface ApiError {
  message: string;
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
    mutate(mutationProps, {
      onSuccess: data => {
        const message =
          typeof successMessage === 'function' ? successMessage(data) : (successMessage ?? 'Элемент успешно удалён');
        showNotification('success', 'Успех', message);
        closeModal();
        onSuccess?.(data);
        if (redirectPath) {
          const delay = redirectDelayMs ?? CONFIRM_MODAL_DEFAULT_REDIRECT_MS;
          window.setTimeout(() => {
            const nextState = typeof redirectState === 'function' ? redirectState(data) : redirectState;
            navigate(redirectPath, {
              replace: redirectReplace,
              ...(nextState !== undefined ? { state: nextState } : {}),
            });
          }, delay);
        }
      },
      onError: error => {
        const apiMessage = (error as any).response?.data?.message;
        showNotification('error', 'Ошибка', apiMessage || (error as ApiError)?.message || errorMessage);
      },
    });
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
  const handleOpenModal = () => {
    openModal({
      title: 'Вы уверены?',
      type: modalType,
      onConfirm,
      onCancel,
      loading: isPending || false,
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
