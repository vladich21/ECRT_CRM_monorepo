import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Button, Space, Tabs } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDeletePartner, usePartnerById } from '../../api/partners/partnerApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import { BackButton } from '../../components/backButton/BackButton';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';

export default function PartnerDetailsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: partner, isLoading, isError } = usePartnerById(partnerId!);
  const mutation = useDeletePartner();

  // Определяем активную вкладку из URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contacts';
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/files')) return 'files';
    return 'main';
  };

  const activeTab = getActiveTabFromPath();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Поставщик успешно удалён',
    errorMessage: 'Не удалось удалить поставщика',
    redirectPath: '/partners',
    getMutationProps: () => partnerId!,
    showNotification,
  });

  const handleEdit = () => {
    navigate(`/partners/${partnerId}/edit`);
  };

  // Обработчик смены вкладки
  const handleTabChange = (key: string) => {
    const basePath = `/partners/${partnerId}`;

    switch (key) {
      case 'main':
        navigate(basePath);
        break;
      case 'contacts':
        navigate(`${basePath}/contacts`);
        break;
      case 'contracts':
        navigate(`${basePath}/contracts`);
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

  if (isError || !partner) {
    return <NotFound errorMessage='Поставщик не найден' />;
  }

  const tabItems = [
    {
      key: 'main',
      label: 'Основная информация',
    },
    {
      key: 'contacts',
      label: 'Контактные лица',
    },
    {
      key: 'contracts',
      label: 'Договоры',
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
        <BackButton path='/partners' />
        <Card
          title={partner.short_name || partner.name || 'Поставщик'}
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
          <Outlet context={partner} />
        </Card>
      </Space>
    </div>
  );
}
