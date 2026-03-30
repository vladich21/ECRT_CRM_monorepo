import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { useDeletePartnerCompetence, usePartnerCompetencies } from '../../../api/partners/partnerCompetenceApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { openAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useNotification } from '../../../customhooks/useNotification';
import { COMPETENCE_TAG_BG, COMPETENCE_TAG_BORDER, COMPETENCE_TAG_TEXT } from '../../../constants/competenceDisplay';
import { PartnerCompetence } from '../../../types/partner';

export default function PartnerCompetencesListPage() {
  const navigate = useNavigate();
  const { data: partnerCompetences = [], isLoading, isError } = usePartnerCompetencies();
  const { contextHolder, showNotification } = useNotification();
  const deleteCompetenceIdRef = useRef('');
  const deletePartnerCompetenceMutation = useDeletePartnerCompetence();
  const onEdit = (record: PartnerCompetence) => {
    navigate(`/competencies/${record.id}/edit`, {});
  };
  const onDelete = ({ id }: { id: number }) => {
    deleteCompetenceIdRef.current = String(id);
    openAntdDeleteConfirm({
      mutation: deletePartnerCompetenceMutation,
      getVariables: () => deleteCompetenceIdRef.current,
      showNotification,
      successMessage: 'Компетенция партнера успешно удалена',
      errorMessage: 'Не удалось удалить компетенцию партнера',
      navigate,
    });
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
            previewBgColor={COMPETENCE_TAG_BG}
            previewTextColor={COMPETENCE_TAG_TEXT}
            previewBorderColor={COMPETENCE_TAG_BORDER}
            previewText={competence.name}
            onEdit={() => onEdit(competence)}
            onDelete={() => onDelete({ id: Number(competence.id) })}
          />
        ))}
      </ReferenceBookCardList>
    </ReferenceBookListPage>
  );
}
