import { Button, Space } from 'antd';

import type { ConfirmModalAppearance, ModalShellProps } from '@/store/ModalStore';

import { BaseModal } from '../BaseModal';

export type ConfirmModalProps = ModalShellProps;

export const ConfirmModal: React.FC<ModalShellProps> = ({
  content,
  confirmAppearance,
  okText,
  cancelText = 'Отмена',
  onConfirm,
  loading = false,
  open,
  title,
  onCancel,
}) => {
  const appearance: ConfirmModalAppearance = confirmAppearance ?? 'info';

  const getButtonProps = () => {
    switch (appearance) {
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
      <Button {...getButtonProps()} onClick={() => void onConfirm()} loading={loading} />
    </Space>
  );

  return (
    <BaseModal open={open} title={title} onCancel={onCancel} footer={footer}>
      {content}
    </BaseModal>
  );
};
