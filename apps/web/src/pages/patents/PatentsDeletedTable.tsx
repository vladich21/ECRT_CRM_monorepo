import { Patent } from '../../types/patent';
import BasicTable from '../../components/basicTable/BasicTable';
import { getDeletedColumns, ReferenceDataForPatents } from './data';
import { useDeletedPatents, useRestorePatent } from '../../api/patents/patentApiHooks';
import { useEffect, useRef } from 'react';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { NotificationType } from '../../customhooks/useNotification';
import { useModalStore } from '../../store/ModalStore';
import { NotFound } from '../../components/notFound/NotFound';
import { useFilteredPatents } from './hooks/useFilteredPatents';
import { useNavigate } from 'react-router-dom';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';

interface DeletedPatentsTableProps {
  referenceData: ReferenceDataForPatents;
  filters: Record<string, any>;
  showNotification: (type: NotificationType, title: string, description?: string) => void;
  /** Вызывается после успешного восстановления — переключить на вкладку «Активные» */
  onRestoreSuccess?: () => void;
}

export default function DeletedPatentsTable({
  referenceData,
  filters,
  showNotification,
  onRestoreSuccess,
}: DeletedPatentsTableProps) {
  const navigate = useNavigate();
  const pendingPatentIdRef = useRef('');
  const modalProps = useModalStore();
  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } = useServerTablePagination();
  const { data, isLoading, isError } = useDeletedPatents(page, pageSize);
  const patents = data?.data ?? [];
  const total = data?.total ?? 0;

  const restoreMutation = useRestorePatent();

  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Патент успешно восстановлен',
    errorMessage: 'Не удалось восстановить патент',
    getMutationProps: () => pendingPatentIdRef.current,
    showNotification,
    onSuccess: () => {
      onRestoreSuccess?.();
    },
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

  const onRestore = (record: Patent) => {
    pendingPatentIdRef.current = record.id;
    openRestoreModal();
  };

  const handleRowClick = (record: Patent) => {
    navigate(`/patents/${record.id}`, {
      state: { user: record, from: 'patents-list', tab: 'deleted' as const },
    });
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <BasicTable<Patent>
      data={filteredPatents}
      loading={isLoading}
      columns={getDeletedColumns(referenceData)}
      onRowClick={handleRowClick}
      showActions={true}
      onRestore={onRestore}
      actionsColumnTitle='Действия'
      actionsColumnWidth={40}
      rowKey='id'
      pagination={getPaginationConfig(total)}
      onChange={handleTableChange}
    />
  );
}
