import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import BasicTable from '../../../components/basicTable/BasicTable';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { NotFound } from '../../../components/notFound/NotFound';
import { useNotification } from '../../../customhooks/useNotification';
import { useEffect, useState } from 'react';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { PatentGrant } from '../../../types/patent';
import { usePatentGrants, useDeletePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { columns } from './data';

export default function PatentGrantsListPage() {
  const navigate = useNavigate();
  const { patentId } = useParams();
  const { data: patentGrants = [], isLoading, isError } = usePatentGrants(patentId);

  const { contextHolder, showNotification } = useNotification();
  const [currentGrantId, setCurrentGrantId] = useState('');

  const deletePatentGrantMutation = useDeletePatentGrant();

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deletePatentGrantMutation,
    successMessage: 'Патентный грант успешно удален',
    errorMessage: 'Не удалось удалить патентный грант',
    getMutationProps: () => currentGrantId,
    showNotification,
  });

  useEffect(() => {
    if (currentGrantId) openDeleteModal();
  }, [currentGrantId]);

  const handleRowClick = (record: PatentGrant) => {
    navigate(`/patent-grants/${record.id}`, {
      state: { from: patentId },
    });
  };

  const onEdit = (record: PatentGrant) => {
    navigate(`/patent-grants/${record.id}/edit`, {});
  };

  const onDelete = ({ id }: { id: string }) => {
    setCurrentGrantId(id.toString());
  };

  if (isError) {
    return <NotFound errorMessage='Не удалось выполнить запрос' />;
  }

  return (
    <div>
      {contextHolder}
      <h1>Патентные гранты</h1>
      <Button 
        type='primary' 
        onClick={() => navigate('/patent-grants/create', { state: { patentId } })} 
        style={{ marginBottom: 16 }}
      >
        Добавить патентный грант
      </Button>

      <BasicTable<PatentGrant>
        data={patentGrants}
        loading={isLoading}
        columns={columns}
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
