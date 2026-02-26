import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Button, Space, Tabs } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDeletePatentGrant, usePatentGrantById } from '../../../api/patents/patentGrantsApiHooks';
import { NotFound } from '../../../components/notFound/NotFound';
import { Loader } from '../../../components/loader/Loader';
import { BackButton } from '../../../components/backButton/BackButton';
import { useNotification } from '../../../customhooks/useNotification';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { PatentGrantMainInfoTab } from './detailsTabs/PatentGrantMainInfoTab';

export default function PatentGrantDetailsPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: patentGrant, isLoading, isError } = usePatentGrantById(grantId!);
  const mutation = useDeletePatentGrant();

  // Определяем активную вкладку из URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/files')) return 'files';
    return 'main';
  };

  const activeTab = getActiveTabFromPath();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Патентный грант успешно удалён',
    errorMessage: 'Не удалось удалить патентный грант',
    getMutationProps: () => grantId!,
    showNotification,
    onSuccess: () => setTimeout(() => navigate(-1), 1000),
  });

  const handleEdit = () => {
    navigate(`/patent-grants/${grantId}/edit`);
  };

  // Обработчик смены вкладки
  const handleTabChange = (key: string) => {
    const basePath = `/patent-grants/${grantId}`;

    switch (key) {
      case 'main':
        navigate(basePath);
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

  if (isError || !patentGrant) {
    return <NotFound errorMessage='Патентный грант не найден' />;
  }

  const tabItems = [
    {
      key: 'main',
      label: 'Основное',
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
        <BackButton path={`/patents/${patentGrant.patent_id}/grants`} />
        <Card
          title={`Патентный грант ${patentGrant.grant_number}`}
          extra={
            <Space>
              <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
                Редактировать
              </Button>
              <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
                Удалить
              </Button>
            </Space>
          }
        >
          <Tabs activeKey={activeTab} items={tabItems} size='large' onChange={handleTabChange} />
          {/* Outlet для рендеринга дочерних компонентов */}
          <Outlet context={patentGrant} />
        </Card>
      </Space>
    </div>
  );
}
