import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button, Tabs } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDeletePartner, usePartnerById } from '../../api/partners/partnerApiHooks';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import { BackButton } from '../../components/backButton/BackButton';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { PageHeader } from '../../components/pageLayout/PageHeader';
import styles from './PartnerDetailsPage.module.scss';

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
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={styles.pageBackRow}>
        <BackButton path='/partners' />
      </div>

      <PageHeader
        title={partner.short_name || partner.name || 'Контрагент'}
        subtitle={partner.name !== partner.short_name ? partner.name : undefined}
        actions={
          <>
            <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
              Редактировать
            </Button>
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
              Удалить
            </Button>
          </>
        }
        filters={
          <div className={styles.pageTabs}>
            <Tabs
              activeKey={activeTab}
              items={tabItems}
              onChange={handleTabChange}
              tabBarStyle={{ margin: 0, borderBottom: 'none' }}
            />
          </div>
        }
      />

      <div className={styles.contentWrap}>
        <Outlet context={partner} />
      </div>
    </div>
  );
}
