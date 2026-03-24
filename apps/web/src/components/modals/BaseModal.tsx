import { ReactNode } from 'react';
import { Modal, ModalProps } from 'antd';

export interface BaseModalProps extends Omit<ModalProps, 'footer'> {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onCancel: () => void;
}

export const BaseModal: React.FC<BaseModalProps> = ({ open, title, children, footer, onCancel, ...modalProps }) => {
  return (
    <Modal open={open} title={title} onCancel={onCancel} footer={footer} centered {...modalProps}>
      {children}
    </Modal>
  );
};
