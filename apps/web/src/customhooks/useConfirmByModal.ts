import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UseMutationResult } from '@tanstack/react-query';
import { useModalStore } from '../store/ModalStore';
import { NotificationType } from './useNotification';
import { ModalType } from '../store/ModalStore';

interface UseDeleteOptions<TData = void, TError = Error, TVariables = string> {
  mutation: UseMutationResult<TData, TError, TVariables>;
  successMessage?: string;
  errorMessage?: string;
  redirectPath?: string;
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
  modalType = 'confirm',
  getMutationProps,
  showNotification,
  onSuccess,
}: UseDeleteOptions<TData, TError, TVariables>): UseDeleteReturn => {
  const navigate = useNavigate();
  const { openModal, closeModal, open: isOpenModal } = useModalStore();

  const { mutate, isPending, isSuccess, isError } = mutation;

  useEffect(() => {
    if (isSuccess) {
      if (redirectPath) {
        setTimeout(() => navigate(redirectPath), 1000);
      }
    }
  }, [isSuccess]);

  const handleOpenModal = () => {
    openModal({
      title: 'Вы уверены?',
      type: modalType,
      onConfirm,
      onCancel,
      loading: isPending || false,
    });
  };

  const handleCloseModal = useCallback(() => {
    closeModal();
  }, []);

  const onConfirm = useCallback(() => {
    const mutationProps = getMutationProps();
    if (!mutationProps) {
      showNotification('error', 'Ошибка', 'ID не найден');
      return;
    }

    mutate(mutationProps, {
      onSuccess: (data) => {
        showNotification('success', 'Успех', successMessage);
        closeModal();

        if (onSuccess) {
          onSuccess(data);
        }
      },
      onError: error => {
        const apiMessage = (error as any).response.data.message;
        showNotification('error', 'Ошибка', apiMessage || (error as ApiError)?.message || errorMessage);
      },
    });
  }, [getMutationProps, mutate, showNotification]);

  const onCancel = useCallback(() => {
    closeModal();
  }, []);

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
