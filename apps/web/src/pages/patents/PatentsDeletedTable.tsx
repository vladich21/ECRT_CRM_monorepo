import { Patent } from '../../types/patent';
import BasicTable from '../../components/basicTable/BasicTable';
import { getDeletedColumns, ReferenceDataForPatents } from './data';
import { useDeletedPatents, useRestorePatent } from '../../api/patents/patentApiHooks';
import { useEffect, useState } from 'react';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { NotificationType } from '../../customhooks/useNotification';
import { useModalStore } from '../../store/ModalStore';
import { NotFound } from '../../components/notFound/NotFound';
import { useFilteredPatents } from './hooks/useFilteredPatents';
import { useNavigate } from 'react-router-dom';

interface DeletedPatentsTableProps {
  referenceData: ReferenceDataForPatents;
  filters: Record<string, any>;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
}

export default function DeletedPatentsTable({ referenceData, filters, showNotification }: DeletedPatentsTableProps) {
  const navigate = useNavigate();
  const [currentPatentId, setCurrentPatentId] = useState<string>('');
  const modalProps = useModalStore();
  const { data: patents = [], isLoading, isError } = useDeletedPatents();

  const restoreMutation = useRestorePatent();

  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Патент успешно восстановлен',
    errorMessage: 'Не удалось восстановить патент',
    getMutationProps: () => currentPatentId,
    showNotification,
  });

  const filterPatents = (patents: Patent[]) => useFilteredPatents(patents, filters);

  useEffect(() => {
    if (currentPatentId) openRestoreModal();
  }, [currentPatentId]);

  useEffect(() => {
    if (!modalProps.open) {
      setCurrentPatentId('');
    }
  }, [modalProps.open]);

  const onRestore = (record: Patent) => {
    setCurrentPatentId(record.id.toString());
  };

  const handleRowClick = (record: Patent) => {
    navigate(`/patents/${record.id}`, {
      state: {
        user: record,
        from: 'patents-list',
      },
    });
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <BasicTable<Patent>
      data={filterPatents(patents)}
      loading={isLoading}
      columns={getDeletedColumns(referenceData)}
      onRowClick={handleRowClick}
      showActions={true}
      onRestore={onRestore}
      actionsColumnTitle='Действия'
      actionsColumnWidth={40}
      rowKey='id'
    />
  );
}
