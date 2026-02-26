// components/Modal/PartnerContactFormModal.tsx
import { BaseModal, BaseModalProps } from '../BaseModal';
import { useEffect, useState } from 'react';
import { ModalState } from '../../../store/ModalStore';
import { getChangedFields } from '../../../helpers/getChangedFields';
import FileUpload, { FileWithId } from '../../fileUploader/FileUploader';

export interface FileModalProps extends Omit<BaseModalProps, 'footer' | 'children'> {
  isLoading: boolean;
  onConfirm: (data: FileWithId[]) => Promise<void>;
}

export const FileUploadModal: React.FC<FileModalProps> = ({
  cancelText = 'Отмена',
  onConfirm,
  isLoading,
  ...layoutProps
}) => {
  return (
    <BaseModal {...layoutProps} footer={null}>
      <FileUpload onConfirm={onConfirm} isLoading={isLoading} />
    </BaseModal>
  );
};
