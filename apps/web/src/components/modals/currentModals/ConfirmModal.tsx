import { ReactNode } from 'react';
import { Button, Space } from 'antd';

import type { ConfirmModalAppearance } from '../../../store/ModalStore';
import { BaseModal, BaseModalProps } from '../BaseModal';

export interface ConfirmModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  content?: ReactNode;
  type?: 'delete' | 'warning' | 'info' | 'success' | 'confirm';
  confirmAppearance?: ConfirmModalAppearance;
  okText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  modalData?: unknown;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  content,
  type: typeProp = 'info',
  confirmAppearance,
  okText,
  cancelText = 'Отмена',
  onConfirm,
  loading = false,
  open,
  title,
  onCancel,
  modalData: _modalData,
  ..._rest
}) => {
  const type: ConfirmModalProps['type'] =
    confirmAppearance ?? (typeProp === 'confirm' || !typeProp ? 'info' : typeProp);
  const getButtonProps = () => {
    switch (type) {
      case 'delete':
        return {
          type: 'primary' as const,
          danger: true,
          children: okText || 'Удалить',
        };
      case 'warning':
        return {
          type: 'primary' as const,
          children: okText || 'Продолжить',
        };
      case 'success':
        return {
          type: 'primary' as const,
          children: okText || 'ОК',
        };
      default:
        return {
          type: 'primary' as const,
          children: okText || 'Подтвердить',
        };
    }
  };

  const footer = (
    <Space>
      <Button onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button {...getButtonProps()} onClick={onConfirm} loading={loading} />
    </Space>
  );

  return (
    <BaseModal open={open} title={title} onCancel={onCancel} footer={footer}>
      {content}
    </BaseModal>
  );
};
