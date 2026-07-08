import { useRef } from 'react';
import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDeleteFile, useFilesByEntity, useUploadFiles } from '../../api/files/fileApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { BackButton } from '../../components/backButton/BackButton';
import BasicTable from '../../components/basicTable/BasicTable';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import { useOpenAntdDeleteConfirm } from '../../customhooks/confirmDelete';
import { useMutateByModal } from '@/hooks/modals/useMutateByModal';
import { useNotification } from '@/hooks/notifications/useNotification';
import { MyFile } from '../../types/files';
import NotFound from '../NotFound';
import { getColumnsData } from './data';
import styles from './FilesListPage.module.scss';

interface FilesListPageProps {
  entityType?: string;
  label?: string;
}

const FilesListPage: React.FC<FilesListPageProps> = ({ entityType = 'contract', label }) => {
  const { [`${entityType}Id`]: entityId } = useParams();
  const navigate = useNavigate();
  const { contextHolder, showNotification } = useNotification();
  const { data = [], isLoading: loading } = useFilesByEntity(entityType, entityId!);
  const deleteFileIdRef = useRef('');

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['users']);

  const deleteFileMutation = useDeleteFile();
  const openDeleteConfirm = useOpenAntdDeleteConfirm();
  const addFilesMutation = useUploadFiles({ entityType: entityType, entityId: entityId! });


  const { handleOpenModal: openAddModal } = useMutateByModal<MyFile[], Error>({
    isEdit: false,
    mutation: addFilesMutation,
    successMessage: 'Файлы успешно добавлены',
    errorMessage: `Не удалось добавить файлы`,
    modalType: 'fileForm',
    modalTitle: 'Добавление файлов',
    getMutationProps: () => undefined,
    showNotification,
  });

  const onDelete = (record: MyFile) => {
    deleteFileIdRef.current = record.id;
    openDeleteConfirm({
      mutation: deleteFileMutation,
      getVariables: () => ({
        entityType: entityType,
        entityId: entityId!,
        fileId: deleteFileIdRef.current,
      }),
      showNotification,
      successMessage: 'Файл успешно удален',
      errorMessage: 'Не удалось удалить файл',
      navigate,
    });
  };

  if (isReferencesError) return <NotFound />;

  return (
    <div>
      {contextHolder}
      <BackButton />
      <PageHeader
        title={label || 'Файлы'}
        actions={
          <Button type='primary' onClick={() => openAddModal()}>
            Добавить файл
          </Button>
        }
      />

      <div className={styles.tableCard}>
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
    </div>
  );
};

export default FilesListPage;
