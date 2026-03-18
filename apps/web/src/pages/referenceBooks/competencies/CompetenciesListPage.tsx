import { useNavigate } from 'react-router-dom';
import { PartnerCompetence } from '../../../types/partner';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { useEffect, useState } from 'react';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useDeletePartnerCompetence, usePartnerCompetencies } from '../../../api/partners/partnerCompetenceApiHooks';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';

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
      title="Компетенции партнеров"
      addButtonLabel="Добавить компетенцию"
      onAdd={() => navigate('/competencies/create')}
      contextHolder={contextHolder}
    >
      <ReferenceBookCardList>
        {partnerCompetences.map((c) => (
          <ReferenceBookItemCard
            key={c.id}
            title={c.name}
            previewBgColor={c.color_bg || undefined}
            previewTextColor={c.color_text || undefined}
            previewBorderColor={c.color_border || undefined}
            previewText={c.name}
            onEdit={() => onEdit(c)}
            onDelete={() => onDelete({ id: Number(c.id) })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
}
