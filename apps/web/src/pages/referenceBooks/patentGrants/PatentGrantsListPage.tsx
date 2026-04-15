import { Spin } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { NotFound } from '../../../components/notFound/NotFound';
import ReferenceBookListPage from '../../../components/pageLayout/ReferenceBookListPage';
import { ReferenceBookCardList } from '../../../components/referenceBooks/ReferenceBookCardList';
import { usePatentGrants } from '../../../api/patents/patentGrantsApiHooks';
import { PatentGrant } from '../../../types/patent';
import { PatentGrantListCard } from './components/PatentGrantListCard';
import styles from './PatentGrantsListPage.module.scss';

export default function PatentGrantsListPage() {
  const navigate = useNavigate();
  const { patentId } = useParams();
  const { data: patentGrants = [], isLoading, isError } = usePatentGrants(patentId);

  const handleCardClick = (record: PatentGrant) => {
    navigate(`/patent-grants/${record.id}`, {
      state: { from: patentId },
    });
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <ReferenceBookListPage
      title='Охранные документы'
      addButtonLabel='Добавить'
      onAdd={() => navigate('/patent-grants/create', { state: { patentId } })}
    >
      {isLoading ? (
        <div className={styles.loading}>
          <Spin size='large' />
        </div>
      ) : patentGrants.length === 0 ? (
        <div className={styles.empty}>Охранные документы не найдены</div>
      ) : (
        <ReferenceBookCardList>
          {patentGrants.map(grant => (
            <PatentGrantListCard key={grant.id} grant={grant} onClick={() => handleCardClick(grant)} />
          ))}
        </ReferenceBookCardList>
      )}
    </ReferenceBookListPage>
  );
}
