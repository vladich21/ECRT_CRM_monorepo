import type { ReactNode } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ModalType =
  | 'fileForm'
  | 'positionForm'
  | 'contactForm'
  | 'confirm'
  | 'withDescription'
  | 'patentAreaForm'
  | 'approvalStart'
  | 'approvalDecision'
  | 'approvalResubmit';

export type ConfirmModalAppearance = 'delete' | 'warning' | 'info' | 'success';

export interface ModalState {
  open: boolean;
  title: string;
  type: ModalType;
  okText?: string;
  cancelText?: string;
  onConfirm: (data?: unknown) => void | Promise<void>;
  onCancel: (data?: unknown) => void;
  modalData?: unknown;
  loading?: boolean;
  content?: ReactNode;
  confirmAppearance?: ConfirmModalAppearance;

  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  resetModal: () => void;
}

/** Props spread from the store into the active modal shell component. */
export type ModalShellProps = Omit<ModalState, 'openModal' | 'closeModal' | 'setLoading' | 'resetModal'>;

export function pickModalShellProps(state: ModalState): ModalShellProps {
  const {
    openModal: _openModal,
    closeModal: _closeModal,
    setLoading: _setLoading,
    resetModal: _resetModal,
    ...shell
  } = state;
  return shell;
}

/** Flat selector for `useShallow` — nested objects break shallow compare and cause render loops. */
export function selectGlobalModalView(state: ModalState) {
  return {
    open: state.open,
    type: state.type,
    title: state.title,
    okText: state.okText,
    cancelText: state.cancelText,
    onConfirm: state.onConfirm,
    onCancel: state.onCancel,
    modalData: state.modalData,
    loading: state.loading,
    content: state.content,
    confirmAppearance: state.confirmAppearance,
  };
}

export interface ModalConfig {
  title: string;
  type: ModalType;
  okText?: string;
  cancelText?: string;
  onConfirm: (data?: any) => void | Promise<void>;
  onCancel: () => void;
  modalData?: any;
  loading?: boolean;
  content?: ReactNode;
  confirmAppearance?: ConfirmModalAppearance;
}

const initialState = {
  open: false,
  title: '',
  type: '' as ModalType,
  okText: undefined,
  entityId: '',
  cancelText: undefined,
  onConfirm: () => {},
  onCancel: () => {},
  modalData: {},
  loading: false,
  content: undefined,
  confirmAppearance: undefined,
};

export const useModalStore = create<ModalState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      openModal: (config: ModalConfig) => {
        set({
          open: true,
          type: config.type,
          title: config.title,
          okText: config.okText,
          cancelText: config.cancelText,
          onConfirm: config.onConfirm,
          onCancel: config.onCancel,
          modalData: config.modalData,
          loading: config.loading || false,
          content: config.content,
          confirmAppearance: config.confirmAppearance,
        });
      },

      closeModal: () => {
        set({
          open: false,
          loading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },

      resetModal: () => {
        set(initialState);
      },
    }),
    {
      name: 'modal-store',
    },
  ),
);
