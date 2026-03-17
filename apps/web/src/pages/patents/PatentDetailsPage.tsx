import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  UndoOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useDeletePatent, usePatentById, useRestorePatent } from '../../api/patents/patentApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { getNameById } from '../../helpers/getNameById';
import type { ActionType } from './PatentsListPage';
import styles from './PatentDetails.module.scss';

type PatentTab = 'main' | 'files' | 'comments' | 'grants';

const TAB_ITEMS: { key: PatentTab; label: string }[] = [
  { key: 'main', label: 'Основная информация' },
  { key: 'files', label: 'Файлы' },
  { key: 'comments', label: 'Комментарии' },
  { key: 'grants', label: 'Выданные патенты' },
];

function getActiveTabFromPath(pathname: string): PatentTab {
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/comments')) return 'comments';
  if (pathname.includes('/grants')) return 'grants';
  return 'main';
}

const STATUS_STYLE = {
  active: { color: '#52c41a', label: 'Активен' },
  deleted: { color: '#ff4d4f', label: 'Удалён' },
} as const;

export default function PatentDetailsPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTab = (location.state as { tab?: ActionType })?.tab ?? 'active';

  const { contextHolder, showNotification } = useNotification();
  const { data: patent, isLoading, isError } = usePatentById(patentId!);
  const { data: referenceBooks } = useReferenceData([
    'patentStatuses',
    'patentIntellectProps',
    'departments',
  ]);
  const deleteMutation = useDeletePatent();
  const restoreMutation = useRestorePatent();

  const activeTab = getActiveTabFromPath(location.pathname);

  const { handleOpenModal: openDeleteModal } = useConfirmByModal({
    mutation: deleteMutation,
    successMessage: 'Патент успешно удалён',
    errorMessage: 'Не удалось удалить патент',
    redirectPath: '/patents',
    getMutationProps: () => patentId!,
    showNotification,
  });

  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Патент успешно восстановлен',
    errorMessage: 'Не удалось восстановить патент',
    redirectPath: '/patents',
    getMutationProps: () => patentId!,
    showNotification,
  });

  const handleEdit = () => navigate(`/patents/${patentId}/edit`);

  const handleTabChange = (key: string) => {
    const basePath = `/patents/${patentId}`;
    switch (key) {
      case 'files':    navigate(`${basePath}/files`); break;
      case 'comments': navigate(`${basePath}/comments`); break;
      case 'grants':   navigate(`${basePath}/grants`); break;
      default:         navigate(basePath);
    }
  };

  const handleBack = () => {
    navigate('/patents', { state: { tab: returnTab } });
  };

  if (isLoading) return <Loader />;
  if (isError || !patent) return <NotFound errorMessage="Патент не найден" />;

  const ipTypeName = getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, referenceBooks?.patentStatuses) || '';
  const deptName = getNameById(patent.department_id, referenceBooks?.departments) || '';
  const st = patent.is_deleted ? STATUS_STYLE.deleted : STATUS_STYLE.active;

  return (
    <DetailPageHeader
      title={`РИД ${patent.registration_number || '—'}`}
      backLabel="Реестр РИД"
      onBack={handleBack}
      statusBadge={{ label: st.label, color: st.color }}
      metaItems={[
        patent.name && (
          <span key="name" className={styles.metaText}>{patent.name}</span>
        ),
        ipTypeName && (
          <span key="ipType" className={styles.metaType}>{ipTypeName}</span>
        ),
        statusName && (
          <span key="status" className={styles.metaType}>{statusName}</span>
        ),
        deptName && (
          <span key="dept" className={styles.metaText}>
            <TeamOutlined /> {deptName}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            Редактировать
          </Button>
          {patent.is_deleted ? (
            <Button
              type="primary"
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Восстановить
            </Button>
          ) : (
            <Button type="primary" danger icon={<DeleteOutlined />} onClick={openDeleteModal}>
              Удалить
            </Button>
          )}
        </>
      }
      tabs={TAB_ITEMS}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Outlet context={patent} />
    </DetailPageHeader>
  );
}
