import { CalendarOutlined, CopyrightOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDeletePatentGrant, usePatentGrantById } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';

export default function PatentGrantDetailsPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: patentGrant, isLoading, isError } = usePatentGrantById(grantId!);
  const mutation = useDeletePatentGrant();

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

  return (
    <DetailPageHeader
      title={`Патентный грант ${patentGrant.grant_number}`}
      backLabel='Патентные гранты'
      onBack={() => navigate(`/patents/${patentGrant.patent_id}/grants`)}
      statusBadge={
        patentGrant.status
          ? {
              label: patentGrant.status,
              color: patentGrant.status === 'Активный' ? '#52c41a' : '#ff4d4f',
            }
          : undefined
      }
      metaItems={[
        patentGrant.grant_number && (
          <span key='number' className={hStyles.metaText}>
            <CopyrightOutlined /> {patentGrant.grant_number}
          </span>
        ),
        patentGrant.renewal_date && (
          <span key='date' className={hStyles.metaText}>
            <CalendarOutlined /> {new Date(patentGrant.renewal_date).toLocaleDateString('ru-RU')}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <Space>
          <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
            Редактировать
          </Button>
          <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
            Удалить
          </Button>
        </Space>
      }
      tabs={[
        { key: 'main', label: 'Основное' },
        { key: 'files', label: 'Файлы' },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Outlet context={patentGrant} />
    </DetailPageHeader>
  );
}
