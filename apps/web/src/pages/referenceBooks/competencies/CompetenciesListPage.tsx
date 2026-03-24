import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDeletePartnerCompetence, usePartnerCompetencies } from '../../../api/partners/partnerCompetenceApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { PartnerCompetence } from '../../../types/partner';

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
    <ReferenceBookListPage
      title='Компетенции партнеров'
      addButtonLabel='Добавить компетенцию'
      onAdd={() => navigate('/competencies/create')}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {partnerCompetences.map(competence => (
          <ReferenceBookItemCard
            key={competence.id}
            title={competence.name}
            previewBgColor={competence.color_bg || undefined}
            previewTextColor={competence.color_text || undefined}
            previewBorderColor={competence.color_border || undefined}
            previewText={competence.name}
            onEdit={() => onEdit(competence)}
            onDelete={() => onDelete({ id: Number(competence.id) })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
}
