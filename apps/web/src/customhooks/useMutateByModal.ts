import { useCallback } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { isObject } from '../helpers/typeGuards/isObject';
import { ModalType, useModalStore } from '../store/ModalStore';
import { CONFIRM_MODAL_DEFAULT_REDIRECT_MS } from './confirmDelete/constants';
import { NotificationType } from './useNotification';

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
  getModalData?: () => any;
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
  successMessage = 'Элемент успешно изменен',
  errorMessage = 'Не удалось изменить элемент',
  redirectPath,
  modalType,
  getMutationProps,
  showNotification,
  modalTitle = 'Редактирование',
  modalData,
  getModalData,
}: UseEditOptions<TData, TError, TVariables>): UseEditReturn<TData> => {
  const navigate = useNavigate();
  const { openModal, closeModal, open: isOpenModal } = useModalStore();

  const { mutate, isPending, isSuccess, isError, data } = mutation;

  const handleOpenModal = () => {
    openModal({
      title: modalTitle,
      type: modalType,
      onConfirm,
      onCancel,
      modalData: getModalData ? getModalData() : modalData,
      loading: isPending || false,
    });
  };

  const handleCloseModal = useCallback(() => {
    closeModal();
  }, []);

  const onConfirm = useCallback(
    (data: any) => {
      const mutationProps = getMutationProps();
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
            if (redirectPath) {
              window.setTimeout(() => {
                navigate(redirectPath);
              }, CONFIRM_MODAL_DEFAULT_REDIRECT_MS);
            }
          },
          onError: () => {
            showNotification('error', 'Ошибка', errorMessage);
          },
        },
      );
    },
    [
      closeModal,
      errorMessage,
      getMutationProps,
      isEdit,
      mutate,
      navigate,
      redirectPath,
      showNotification,
      successMessage,
    ],
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
