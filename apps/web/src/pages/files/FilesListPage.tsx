import { Button, Space } from 'antd';

import { useNotification } from '../../customhooks/useNotification';
import { useDeleteFile, useFilesByEntity, useUploadFiles } from '../../api/files/fileApiHooks';
import { useEffect, useState } from 'react';
import { useModalStore } from '../../store/ModalStore';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useMutateByModal } from '../../customhooks/useMutateByModal';
import { MyFile } from '../../types/files';
import BasicTable from '../../components/basicTable/BasicTable';
import { getColumnsData } from './data';
import { useParams } from 'react-router-dom';
import { useReferenceData } from '../../api/hooks/useReferences';
import NotFound from '../NotFound';

type ActionType = 'edit' | 'delete' | 'add' | 'view' | '';

interface FilesListPageProps {
  entityType?: string;
  label?: string;
}

const FilesListPage: React.FC<FilesListPageProps> = ({ entityType = 'contract', label }) => {
  const { [`${entityType}Id`]: entityId } = useParams();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = useFilesByEntity(entityType, entityId!);
  const [currentFileId, setCurrentFileId] = useState<string>('');
  const modalProps = useModalStore();

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);

  const deleteFileMutation = useDeleteFile();
  const addFilesMutation = useUploadFiles({ entityType: entityType, entityId: entityId! });

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteFileMutation,
    successMessage: 'Файл успешно удален',
    errorMessage: 'Не удалось удалить файл',
    getMutationProps: () => ({ entityType: entityType, entityId: entityId!, fileId: currentFileId }),
    showNotification,
  });

  const { handleOpenModal: openAddModal } = useMutateByModal<void, Error>({
    isEdit: false,
    mutation: addFilesMutation,
    successMessage: 'Файлы успешно добавлены',
    errorMessage: `Не удалось добавить файлы`,
    modalType: 'fileForm',
    modalTitle: 'Добавление файлов',
    getMutationProps: () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (currentFileId) openDeleteModal();
  }, [currentFileId]);

  useEffect(() => {
    if (!modalProps.open) {
      setCurrentFileId('');
    }
  }, [modalProps.open]);

  const onDelete = (record: MyFile) => {
    setCurrentFileId(record.id.toString());
  };

  if (isReferencesError) return <NotFound />;

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='middle'>
      {contextHolder}
      {label && <h3>{label}</h3>}
      <Button type='primary' onClick={() => openAddModal()} style={{ marginBottom: 16 }}>
        Добавить файл
      </Button>

      <div>
        <BasicTable<MyFile>
          data={data}
          loading={loading && isReferencesLoading}
          columns={getColumnsData(referenceBooks?.users!)}
          enableContextMenu={true}
          onDelete={onDelete}
          showActions={true}
          actionsColumnTitle='Действия'
          actionsColumnWidth={60}
        />
      </div>
    </Space>
  );
};

export default FilesListPage;
