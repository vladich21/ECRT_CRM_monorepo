import { Button, Space } from 'antd';
import { ReactNode } from 'react';
import { BaseModal, BaseModalProps } from '../BaseModal';

export interface ConfirmModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  content?: ReactNode;
  type?: 'delete' | 'warning' | 'info' | 'success';
  okText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  content,
  type = 'info',
  okText,
  cancelText = 'Отмена',
  onConfirm,
  loading = false,
  ...layoutProps
}) => {
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
      <Button onClick={layoutProps.onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button {...getButtonProps()} onClick={onConfirm} loading={loading} />
    </Space>
  );

  return (
    <BaseModal {...layoutProps} footer={footer}>
      {content}
    </BaseModal>
  );
};
