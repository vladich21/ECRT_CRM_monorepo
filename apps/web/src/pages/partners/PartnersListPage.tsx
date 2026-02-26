import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDeletePartner, usePartners } from '../../api/partners/partnerApiHooks';
import BasicTable from '../../components/basicTable/BasicTable';
import { Partner } from '../../types/partner';
import { NotFound } from '../../components/notFound/NotFound';
import { useNotification } from '../../customhooks/useNotification';
import { useEffect, useState } from 'react';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { getColumnsData } from './data';
import { useReferenceData } from '../../api/hooks/useReferences';
import { usePartnerFilters } from './hooks/usePartnerFilters';
import { useFilteredPartners } from './hooks/useFilteredPartners';
import { UniversalFilters } from '../../components/basicFilters/BasicFilters';

export default function PartnersListPage() {
  const navigate = useNavigate();
  const { data: partners = [], isLoading, isError } = usePartners();
  const [filters, setFilters] = useState<Record<string, any>>({});

  const { contextHolder, showNotification } = useNotification();
  const [currentPartnerId, setCurrentPartnerId] = useState('');
  const deletePartnerMutation = useDeletePartner();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePartnerMutation,
    successMessage: 'Поставщик успешно удален',
    errorMessage: 'Не удалось удалить поставщика',
    getMutationProps: () => currentPartnerId,
    showNotification,
  });

  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies']);

  // Используем кастомные хуки для фильтрации
  const { filterConfig } = usePartnerFilters();

  const filteredPartners = useFilteredPartners(partners, filters);

  useEffect(() => {
    if (currentPartnerId) openDeleteModal();
  }, [currentPartnerId]);

  const handleRowClick = (record: Partner) => {
    navigate(`/partners/${record.id}`, {
      state: {
        partner: record,
        from: 'partners-list',
      },
    });
  };

  const onEdit = (record: Partner) => {
    navigate(`/partners/${record.id}/edit`, {});
  };

  const onDelete = ({ id }: { id: string }) => {
    setCurrentPartnerId(id.toString());
  };

  if (isError || isReferencesError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}
      <h1>Контрагенты</h1>
      <Button type='primary' onClick={() => navigate('/partners/create')} style={{ marginBottom: 16 }}>
        Добавить контрагента
      </Button>

      <UniversalFilters filterConfig={filterConfig} value={filters} onChange={setFilters} />

      <BasicTable<Partner>
        data={filteredPartners}
        loading={isLoading && isReferencesLoading}
        columns={getColumnsData({
          competencies: referenceBooks?.competencies!,
          partnerTypes: referenceBooks?.partnerTypes!,
          partnerStatuses: referenceBooks?.partnerStatuses!,
        })}
        onRowClick={handleRowClick}
        enableContextMenu={true}
        showActions
        onEdit={onEdit}
        onDelete={onDelete}
        actionsColumnTitle='Действия'
        actionsColumnWidth={100}
      />
    </div>
  );
}
