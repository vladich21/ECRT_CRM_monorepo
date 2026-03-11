import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getColumnsData } from './data';
import BasicTable from '../../components/basicTable/BasicTable';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { Contract } from '../../types/contract';
import { useContracts, useDeleteContract } from '../../api/contracts/contractApiHooks';
import { useContractFilters } from './hooks/useContractFilters';
import { useFilteredContracts } from './hooks/useFilteredContracts';
import { UniversalFilters } from '../../components/basicFilters/BasicFilters';
import { isContractDraft } from './utils/contractStateUtils';
import { useServerTablePagination } from '../../hooks/useServerTablePagination';

export default function ContractsListPage() {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [currentContractId, setCurrentContractId] = useState('');

  const { page, pageSize, getPaginationConfig, handleTableChange, resetPage } =
    useServerTablePagination();
  const { data, isLoading, isError } = useContracts(
    partnerId ? { partner_id: partnerId } : undefined,
    page,
    pageSize,
  );
  const contracts = data?.data ?? [];
  const total = data?.total ?? 0;

  const { contextHolder, showNotification } = useNotification();
  const deleteContractMutation = useDeleteContract();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteContractMutation,
    successMessage: 'Договор успешно удален',
    errorMessage: 'Не удалось удалить договор',
    getMutationProps: () => currentContractId,
    showNotification,
  });

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(['partners', 'contractStates', 'contractCategories']);

  const { filterConfig } = useContractFilters();
  const filteredContracts = useFilteredContracts(contracts, filters);

  useEffect(() => {
    resetPage();
  }, [filters, resetPage]);

  useEffect(() => {
    if (currentContractId) openDeleteModal();
  }, [currentContractId, openDeleteModal]);

  const handleRowClick = (record: Contract) => {
    navigate(`/contracts/${record.id}`, {
      state: {
        contract: record,
        from: 'contracts-list',
      },
    });
  };

  const onEdit = (record: Contract) => {
    navigate(`/contracts/${record.id}/edit`);
  };

  const onDelete = (record: Contract) => {
    if (isContractDraft(record.state_id, referenceBooks?.contractStates)) {
      showNotification('error', 'Ошибка', 'Черновики удалять нельзя');
      return;
    }
    setCurrentContractId(record.id.toString());
  };

  if (isReferencesError || isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}
      <h1>Договоры</h1>
      <Button
        type='primary'
        onClick={() => navigate('/contracts/create', { state: { partnerId } })}
        style={{ marginBottom: 16 }}
      >
        Добавить договор
      </Button>

      <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />

      <div style={{ marginBottom: 16, color: '#666' }}>
        Показано: <strong>{filteredContracts.length}</strong> из <strong>{total}</strong>
      </div>

      <BasicTable<Contract>
        data={filteredContracts}
        loading={isReferencesLoading || isLoading}
        columns={getColumnsData({
          partners: referenceBooks?.partners!,
          contractStates: referenceBooks?.contractStates!,
          contractCategories: referenceBooks?.contractCategories!,
        })}
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
    </div>
  );
}
