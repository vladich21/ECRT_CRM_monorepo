import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UseMutationResult } from '@tanstack/react-query';
import { NotificationType } from './useNotification';
import { ModalType, useModalStore } from '../store/ModalStore';
import { isObject } from '../helpers/typeGuards/isObject';

interface UseEditOptions<TData = void, TError = Error, TVariables = any> {
  isEdit: boolean;
  mutation: UseMutationResult<TData, TError, TVariables>;
  successMessage?: string;
  errorMessage?: string;
  redirectPath?: string;
  getMutationProps: () => TVariables;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  modalTitle?: string;
  modalType: ModalType;
  modalData?: any;
}

interface UseEditReturn<TData> {
  data: TData | undefined;
  isOpenModal: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  handleOpenModal: () => void;
  handleCloseModal: () => void;
  onConfirm: (data?: any) => void;
  onCancel: () => void;
}

export const useMutateByModal = <TData = void, TError = Error, TVariables = any>({
  isEdit,
  mutation,
  successMessage = 'Элемент успешно изменён',
  errorMessage = 'Не удалось изменить элемент',
  redirectPath,
  modalType,
  getMutationProps,
  showNotification,
  modalTitle = 'Редактирование',
  modalData,
}: UseEditOptions<TData, TError, TVariables>): UseEditReturn<TData> => {
  const mutationProps = getMutationProps();
  const navigate = useNavigate();
  const { openModal, closeModal, open: isOpenModal } = useModalStore();

  const { mutate, isPending, isSuccess, isError, data } = mutation;

  useEffect(() => {
    if (!isSuccess) return;
    if (redirectPath) {
      const timeoutId = setTimeout(() => {
        navigate(redirectPath);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isSuccess, successMessage]);

  const handleOpenModal = () => {
    openModal({
      title: modalTitle,
      type: modalType,
      onConfirm,
      onCancel,
      modalData,
      loading: isPending || false,
    });
  };

  const handleCloseModal = useCallback(() => {
    closeModal();
  }, []);

  const onConfirm = useCallback(
    (data: any) => {
      if (!mutationProps && isEdit) {
        showNotification('error', 'Ошибка', 'Данные для редактирования не найдены');
        return;
      }

      mutate(
        (mutationProps
          ? { ...(isObject(mutationProps) ? mutationProps : { id: mutationProps }), data }
          : data) as TVariables,
        {
          onSuccess: () => {
            showNotification('success', 'Успех', successMessage);
            closeModal();
          },
          onError: () => {
            showNotification('error', 'Ошибка', errorMessage);
          },
        },
      );
    },
    [mutate],
  );

  const onCancel = useCallback(() => {
    closeModal();
  }, []);

  return {
    data,
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
