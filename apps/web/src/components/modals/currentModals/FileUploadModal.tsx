import { BaseModal, BaseModalProps } from '../BaseModal';
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
