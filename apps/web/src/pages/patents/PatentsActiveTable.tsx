import { Patent } from '../../types/patent';
import BasicTable from '../../components/basicTable/BasicTable';
import { getActiveColumns, ReferenceDataForPatents } from './data';
import { useEffect, useState } from 'react';
import { NotFound } from '../../components/notFound/NotFound';
import { useActivePatents, useDeletePatent } from '../../api/patents/patentApiHooks';
import { NotificationType } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useNavigate } from 'react-router-dom';
import { useFilteredPatents } from './hooks/useFilteredPatents';

interface ActivePatentsTableProps {
  referenceData: ReferenceDataForPatents;
  filters: Record<string, any>;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
}

export default function ActivePatentsTable({ referenceData, filters, showNotification }: ActivePatentsTableProps) {
  const navigate = useNavigate();
  const { data: patents = [], isLoading, isError } = useActivePatents();

  const [currentPatentId, setCurrentPatentId] = useState('');
  const deletePatentMutation = useDeletePatent();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePatentMutation,
    successMessage: 'Патент успешно удалена',
    errorMessage: 'Не удалось удалить патент',
    getMutationProps: () => currentPatentId,
    showNotification,
  });

  const filterPatents = (patents: Patent[]) => useFilteredPatents(patents, filters);

  useEffect(() => {
    if (currentPatentId) openDeleteModal();
  }, [currentPatentId]);

  const onEdit = (record: Patent) => {
    navigate(`/patents/${record.id}/edit`, {});
  };

  const onDelete = ({ id }: { id: number }) => {
    setCurrentPatentId(id.toString());
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
    return <NotFound errorMessage='Не удалось подгрузить патенты' />;
  }
  return (
    <BasicTable<Patent>
      data={filterPatents(patents)}
      loading={isLoading}
      columns={getActiveColumns(referenceData)}
      onRowClick={handleRowClick}
      enableContextMenu={true}
      showActions
      onEdit={onEdit}
      onDelete={onDelete}
      actionsColumnTitle='Действия'
      actionsColumnWidth={100}
    />
  );
}
