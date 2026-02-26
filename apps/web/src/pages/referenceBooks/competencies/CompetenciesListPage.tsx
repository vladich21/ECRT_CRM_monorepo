import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getColumnsData } from './data';
import BasicTable from '../../../components/basicTable/BasicTable';
import { PartnerCompetence } from '../../../types/partner';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { useEffect, useState } from 'react';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useDeletePartnerCompetence, usePartnerCompetencies } from '../../../api/partners/partnerCompetenceApiHooks';

export default function PartnerCompetencesListPage() {
  const navigate = useNavigate();
  const { data: partnerCompetences = [], isLoading, isError } = usePartnerCompetencies();

  const { contextHolder, showNotification } = useNotification();
  const [currentCompetenceId, setCurrentCompetenceId] = useState('');
  const deletePartnerCompetenceMutation = useDeletePartnerCompetence();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePartnerCompetenceMutation,
    successMessage: 'Компетенция партнера успешно удалена',
    errorMessage: 'Не удалось удалить компетенцию партнера',
    getMutationProps: () => currentCompetenceId,
    showNotification,
  });

  useEffect(() => {
    if (currentCompetenceId) openDeleteModal();
  }, [currentCompetenceId]);

  const onEdit = (record: PartnerCompetence) => {
    navigate(`/competencies/${record.id}/edit`, {});
  };

  const onDelete = ({ id }: { id: number }) => {
    setCurrentCompetenceId(id.toString());
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}
      <h1>Компетенции партнеров</h1>
      <Button type='primary' onClick={() => navigate('/competencies/create')} style={{ marginBottom: 16 }}>
        Добавить компетенцию
      </Button>

      <BasicTable<PartnerCompetence>
        data={partnerCompetences}
        loading={isLoading}
        columns={getColumnsData()}
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
