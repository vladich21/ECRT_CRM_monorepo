import { FormInstance } from 'antd';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ModalType = 'fileForm' | 'positionForm' | 'contactForm' | 'confirm' | 'withDescription' | 'patentAreaForm';

export interface ModalState {
  open: boolean;
  title: string;
  type: ModalType;
  okText?: string;
  cancelText?: string;
  onConfirm: (data?: any) => void | Promise<void>;
  onCancel: (data?: any) => void;
  modalData?: any;
  loading?: boolean;

  // Actions
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  setLoading: (loading: boolean) => void;
  resetModal: () => void;
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
