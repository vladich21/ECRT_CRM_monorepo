import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Card, Button, Space, Tabs, Tag } from 'antd';
import {
  CommentOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useDeletePatent, usePatentById } from '../../api/patents/patentApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import { BackButton } from '../../components/backButton/BackButton';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';

export default function PatentDetailsPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: patent, isLoading, isError } = usePatentById(patentId!);
  const mutation = useDeletePatent();

  // Определяем активную вкладку из URL
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/files')) return 'files';
    if (path.includes('/comments')) return 'comments';
    if (path.includes('/grants')) return 'grants';
    return 'main';
  };

  const activeTab = getActiveTabFromPath();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Патент успешно удалён',
    errorMessage: 'Не удалось удалить патент',
    redirectPath: '/patents',
    getMutationProps: () => patentId!,
    showNotification,
  });

  const handleEdit = () => {
    navigate(`/patents/${patentId}/edit`);
  };

  // Обработчик смены вкладки
  const handleTabChange = (key: string) => {
    const basePath = `/patents/${patentId}`;

    switch (key) {
      case 'main':
        navigate(basePath);
        break;
      case 'files':
        navigate(`${basePath}/files`);
        break;
      case 'comments':
        navigate(`${basePath}/comments`);
        break;
      case 'grants':
        navigate(`${basePath}/grants`);
        break;
      default:
        navigate(basePath);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !patent) {
    return <NotFound errorMessage='Патент не найден' />;
  }

  const tabItems = [
    {
      key: 'main',
      label: 'Основная информация',
    },
    {
      key: 'files',
      label: 'Файлы',
      icon: <FileTextOutlined />,
    },
    {
      key: 'comments',
      label: 'Комментарии',
      icon: <CommentOutlined />,
    },
    {
      key: 'grants',
      label: 'Выданные патенты',
      icon: <SafetyCertificateOutlined />,
    },
  ];

  return (
    <div>
      {contextHolder}
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        <BackButton path='/patents' />
        <Card
          title={
            <>
              {`РИД ${patent.registration_number} - ${patent.name} `}
              {patent.is_deleted ? <Tag color='red'>Удален</Tag> : <Tag color='green'>Активен</Tag>}
            </>
          }
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
          <Outlet context={patent} />
        </Card>
      </Space>
    </div>
  );
}
