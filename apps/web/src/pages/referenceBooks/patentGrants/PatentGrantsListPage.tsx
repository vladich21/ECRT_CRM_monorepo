import { useRef } from 'react';
import { Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useDeletePatentGrant, usePatentGrants } from '../../../api/patents/patentGrantsApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { ReferenceBookItemCard } from '../../../components/referenceBooks/ReferenceBookItemCard';
import { openAntdDeleteConfirm } from '../../../customhooks/confirmDelete';
import { useNotification } from '../../../customhooks/useNotification';
import { PatentGrant } from '../../../types/patent';
import styles from './PatentGrantsListPage.module.scss';

function formatDate(dateStr?: string) {
  return dateStr ? new Date(dateStr).toLocaleDateString('ru-RU') : '';
}
export default function PatentGrantsListPage() {
  const navigate = useNavigate();
  const { patentId } = useParams();
  const { data: patentGrants = [], isLoading, isError } = usePatentGrants(patentId);
  const { contextHolder, showNotification } = useNotification();
  const deleteGrantIdRef = useRef('');
  const deletePatentGrantMutation = useDeletePatentGrant();
  const handleCardClick = (record: PatentGrant) => {
    navigate(`/patent-grants/${record.id}`, {
      state: { from: patentId },
    });
  };
  const onEdit = (record: PatentGrant) => {
    navigate(`/patent-grants/${record.id}/edit`, {});
  };
  const onDelete = (record: PatentGrant) => {
    deleteGrantIdRef.current = record.id;
    openAntdDeleteConfirm({
      mutation: deletePatentGrantMutation,
      getVariables: () => deleteGrantIdRef.current,
      showNotification,
      successMessage: 'Патентный грант успешно удален',
      errorMessage: 'Не удалось удалить патентный грант',
      navigate,
    });
  };
  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }
  const subtitleParts = (g: PatentGrant) => {
    const parts: string[] = [];
    if (g.grant_date) parts.push(`Выдан: ${formatDate(g.grant_date)}`);
    if (g.renewal_date) parts.push(`Продление: ${formatDate(g.renewal_date)}`);
    if (g.office) parts.push(g.office);
    return parts.join(' • ');
  };
  return (
    <ReferenceBookListPage
      title='Патентные гранты'
      addButtonLabel='Добавить патентный грант'
      onAdd={() => navigate('/patent-grants/create', { state: { patentId } })}
      contextHolder={contextHolder}
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : patentGrants.length === 0 ? (
        <div className={styles.empty}>Патентные гранты не найдены</div>
      ) : (
        <ReferenceBookCardList>
          {patentGrants.map(grant => (
            <ReferenceBookItemCard
              key={grant.id}
              title={grant.grant_number || '—'}
              metaText={grant.status}
              subtitle={subtitleParts(grant)}
              onClick={() => handleCardClick(grant)}
              onEdit={() => onEdit(grant)}
              onDelete={() => onDelete(grant)}
            />
          ))}
        </ReferenceBookCardList>
      )}
    </ReferenceBookListPage>
  );
}
