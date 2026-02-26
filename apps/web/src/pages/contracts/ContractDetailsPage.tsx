import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Button, Space, Tabs } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDeleteContract, useContractById } from '../../api/contracts/contractApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import { BackButton } from '../../components/backButton/BackButton';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useReferenceData } from '../../api/hooks/useReferences';
import { isContractDraft } from './utils/contractStateUtils';

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: contract, isLoading, isError } = useContractById(contractId!);
  const { data: referenceBooks } = useReferenceData(['contractStates']);
  const mutation = useDeleteContract();

  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/files')) return 'files';
    if (path.includes('/additional-agreements')) return 'additional-agreements';

    return 'main';
  };

  const activeTab = getActiveTabFromPath();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Договор успешно удалён',
    errorMessage: 'Не удалось удалить договор',
    redirectPath: '/contracts',
    getMutationProps: () => contractId!,
    showNotification,
  });

  const handleEdit = () => {
    navigate(`/contracts/${contractId}/edit`);
  };

  const handleDelete = () => {
    if (isContractDraft(contract?.state_id, referenceBooks?.contractStates)) {
      showNotification('error', 'Ошибка', 'Черновики удалять нельзя');
      return;
    }
    handleOpenModal();
  };

  const handleTabChange = (key: string) => {
    const basePath = `/contracts/${contractId}`;

    switch (key) {
      case 'main':
        navigate(basePath);
        break;
      case 'additional-agreements':
        navigate(`${basePath}/additional-agreements`);
        break;
      case 'files':
        navigate(`${basePath}/files`);
        break;
      default:
        navigate(basePath);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !contract) {
    return <NotFound errorMessage='Договор не найден' />;
  }

  const tabItems = [
    {
      key: 'main',
      label: 'Основное',
    },
    {
      key: 'additional-agreements',
      label: 'Доп. соглашения',
    },
    {
      key: 'files',
      label: 'Файлы',
    },
  ];

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton path='/contracts' />
        <Card
          title={`Договор ${contract.number}${contract.cipher ? ` (${contract.cipher})` : ''}`}
          extra={
            <Space>
              <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
                Редактировать
              </Button>
              <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleDelete}>
                Удалить
              </Button>
            </Space>
          }
        >
          <Tabs activeKey={activeTab} items={tabItems} size='large' onChange={handleTabChange} />
          {/* Outlet для рендеринга дочерних компонентов */}
          <Outlet context={contract} />
        </Card>
      </Space>
    </div>
  );
}
