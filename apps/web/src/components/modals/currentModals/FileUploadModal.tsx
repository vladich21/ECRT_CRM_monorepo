import type { ModalShellProps } from '@/store/ModalStore';

import FileUpload, { FileWithId } from '../../fileUploader/FileUploader';
import { BaseModal } from '../BaseModal';

export type FileModalProps = ModalShellProps;

export const FileUploadModal: React.FC<ModalShellProps> = ({ onConfirm, loading = false, ...layoutProps }) => {
  const handleConfirm = (data: FileWithId[]) => Promise.resolve(onConfirm(data));

  return (
    <BaseModal {...layoutProps} footer={null}>
      <FileUpload onConfirm={handleConfirm} isLoading={loading} />
    </BaseModal>
  );
};
