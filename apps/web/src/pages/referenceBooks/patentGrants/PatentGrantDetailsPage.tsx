import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Space } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useFilesByEntity } from '../../../api/files/fileApiHooks';
import { useDeletePatentGrant, usePatentGrantById } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { patentGrantDetailHeaderBadgeVariant } from './constants/patentGrantStatusStyles';
import { getPatentGrantListBackTarget, stateWithoutGrantNavFrom } from './navigation/patentGrantListNavigation';
import { useNotification } from '../../../customhooks/useNotification';

export default function PatentGrantDetailsPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const backTarget = getPatentGrantListBackTarget(location.state);
  const patentCardExtras = stateWithoutGrantNavFrom(location.state);
  const { contextHolder, showNotification } = useNotification();
  const { data: patentGrant, isLoading, isError } = usePatentGrantById(grantId!);
  const { data: grantFiles, isLoading: isGrantFilesLoading } = useFilesByEntity('grant', grantId!);
  const mutation = useDeletePatentGrant();

  const filesTabLabel =
    isGrantFilesLoading && grantFiles === undefined ? 'Файлы' : `Файлы (${grantFiles?.length ?? 0})`;

  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/files')) return 'files';
    return 'main';
  };

  const activeTab = getActiveTabFromPath();

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Охранный документ успешно удалён',
    errorMessage: 'Не удалось удалить охранный документ',
    redirectPath: backTarget.path,
    redirectState: patentCardExtras,
    getMutationProps: () => grantId!,
    showNotification,
  });

  const handleBack = () => {
    navigate(backTarget.path, patentCardExtras ? { state: patentCardExtras } : {});
  };

  const handleEdit = () => {
    navigate(`/patent-grants/${grantId}/edit`, { state: location.state });
  };

  const handleTabChange = (key: string) => {
    const basePath = `/patent-grants/${grantId}`;
    const navOpts = { state: location.state };

    switch (key) {
      case 'main':
        navigate(basePath, navOpts);
        break;
      case 'files':
        navigate(`${basePath}/files`, navOpts);
        break;
      default:
        navigate(basePath, navOpts);
    }
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !patentGrant) {
    return <NotFound errorMessage='Охранный документ не найден' />;
  }

  return (
    <DetailPageHeader
      title='Охранный документ'
      titleWeight='medium'
      backLabel={backTarget.label}
      onBack={handleBack}
      statusBadge={
        patentGrant.status
          ? {
              label: patentGrant.status,
              variant: patentGrantDetailHeaderBadgeVariant(patentGrant.status),
            }
          : undefined
      }
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
        { key: 'main', label: 'Основная информация' },
        { key: 'files', label: filesTabLabel },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Outlet context={patentGrant} />
    </DetailPageHeader>
  );
}
