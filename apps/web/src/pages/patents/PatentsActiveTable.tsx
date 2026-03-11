import { Patent } from '../../types/patent';
import BasicTable from '../../components/basicTable/BasicTable';
import { getActiveColumns, ReferenceDataForPatents } from './data';
import { useEffect, useRef } from 'react';
import { NotFound } from '../../components/notFound/NotFound';
import { useActivePatents, useDeletePatent } from '../../api/patents/patentApiHooks';
import { NotificationType } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useModalStore } from '../../store/ModalStore';
import { useNavigate } from 'react-router-dom';
import { useFilteredPatents } from './hooks/useFilteredPatents';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';

interface ActivePatentsTableProps {
  referenceData: ReferenceDataForPatents;
  filters: Record<string, any>;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
}

export default function ActivePatentsTable({ referenceData, filters, showNotification }: ActivePatentsTableProps) {
  const navigate = useNavigate();
  const modalProps = useModalStore();
  const pendingPatentIdRef = useRef('');
  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } = useServerTablePagination();
  const { data, isLoading, isError } = useActivePatents(page, pageSize);
  const patents = data?.data ?? [];
  const total = data?.total ?? 0;

  const deletePatentMutation = useDeletePatent();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePatentMutation,
    successMessage: 'Патент успешно удалён',
    errorMessage: 'Не удалось удалить патент',
    getMutationProps: () => pendingPatentIdRef.current,
    showNotification,
  });

  const filteredPatents = useFilteredPatents(patents, filters);

  useEffect(() => {
    resetPage();
  }, [filters, resetPage]);

  useEffect(() => {
    if (!modalProps.open) {
      pendingPatentIdRef.current = '';
    }
  }, [modalProps.open]);

  const onEdit = (record: Patent) => {
    navigate(`/patents/${record.id}/edit`);
  };

  const onDelete = (record: Patent) => {
    pendingPatentIdRef.current = record.id;
    openDeleteModal();
  };

  const handleRowClick = (record: Patent) => {
    navigate(`/patents/${record.id}`, {
      state: { user: record, from: 'patents-list', tab: 'active' as const },
    });
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось подгрузить патенты' />;
  }
  return (
    <BasicTable<Patent>
      data={filteredPatents}
      loading={isLoading}
      columns={getActiveColumns(referenceData)}
      onRowClick={handleRowClick}
      enableContextMenu={true}
      showActions
      onEdit={onEdit}
      onDelete={onDelete}
      actionsColumnTitle='Действия'
      actionsColumnWidth={100}
      pagination={getPaginationConfig(total)}
      onChange={handleTableChange}
    />
  );
}
