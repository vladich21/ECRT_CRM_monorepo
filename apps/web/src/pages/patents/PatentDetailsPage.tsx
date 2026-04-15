import { DeleteOutlined, EditOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { useDeletePatent, usePatentById, useRestorePatent } from '@/api/patents/patentApiHooks';
import { usePatentGrants } from '@/api/patents/patentGrantsApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPatentRidStatus } from '@/components/pageLayout/DetailPageHeader';
import { useConfirmByModal } from '@/customhooks/useConfirmByModal';
import { useNotification } from '@/customhooks/useNotification';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import { formatPatentRegistryCardHeading } from '@/pages/patents/utils/patentRegistryCardUtils';
import listCardStyles from '@/pages/patents/PatentsListPage.module.scss';
import styles from './PatentDetails.module.scss';
import type { ActionType } from './types/PatentsListPage.types';
import type { PatentsListNavSnapshot } from './utils/patentsListNavSnapshot';

type PatentTab = 'main' | 'files' | 'comments' | 'grants';
function getActiveTabFromPath(pathname: string): PatentTab {
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/comments')) return 'comments';
  if (pathname.includes('/grants')) return 'grants';
  return 'main';
}
export default function PatentDetailsPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as {
    tab?: ActionType;
    patentsListReturn?: PatentsListNavSnapshot;
  } | null;
  const returnTab = navState?.tab === 'deleted' ? 'deleted' : 'all';
  const patentsListReturn = navState?.patentsListReturn;
  const { contextHolder, showNotification } = useNotification();
  const { data: patent, isLoading, isError } = usePatentById(patentId!);
  const { data: patentFiles, isLoading: isPatentFilesLoading } = useFilesByEntity('patent', patentId!);
  const { data: patentGrants = [] } = usePatentGrants(patentId!);
  const { data: referenceBooks } = useReferenceData([
    'patentStatuses',
    'patentIntellectProps',
    'departments',
    'users',
    'projects',
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
  const handleBack = () => {
    navigate('/patents', {
      state: {
        tab: returnTab,
        ...(patentsListReturn ? { patentsListReturn } : {}),
      },
    });
  };
  if (isLoading) return <Loader />;
  if (isError || !patent) return <NotFound errorMessage='Патент не найден' />;
  const ipTypeName = getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, referenceBooks?.patentStatuses) || '';
  const responsibleName =
    getNameById(patent.responsible_for_patenting_id, referenceBooks?.users ?? []) || '—';
  const projectEntity = getEntityById(patent.project_id, referenceBooks?.projects ?? []);
  const projectChipLabel = formatProjectChipLabel(projectEntity);
  const headerStatusBadge = patent.is_deleted
    ? { label: 'Удалён' as const, variant: 'danger' as const }
    : {
        label: statusName || 'Статус не указан',
        variant: detailHeaderVariantForPatentRidStatus(statusName),
      };
  const title = formatPatentRegistryCardHeading(patent);
  const filesTabLabel =
    isPatentFilesLoading && patentFiles === undefined
      ? 'Файлы'
      : `Файлы (${patentFiles?.length ?? 0})`;
  return (
    <DetailPageHeader
      title={title}
      titleWeight='medium'
      backLabel='Реестр РИД'
      onBack={handleBack}
      statusBadge={headerStatusBadge}
      subtitle={
        <div className={styles.detailHeaderSubtitle}>
          <UserOutlined style={{ fontSize: 14 }} />
          <span>{responsibleName}</span>
        </div>
      }
      metaItems={[
        ipTypeName ? (
          <span key='ipType' className={`${listCardStyles.typeChip} ${listCardStyles.chipTight}`}>
            {ipTypeName}
          </span>
        ) : null,
        projectChipLabel ? (
          <span
            key='project'
            className={`${listCardStyles.projectChip} ${listCardStyles.chipTight} ${styles.detailHeaderProjectChip}`}
          >
            {projectChipLabel}
          </span>
        ) : null,
      ].filter(Boolean)}
      actions={
        <>
          <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
            Редактировать
          </Button>
          {patent.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Восстановить
            </Button>
          ) : (
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={openDeleteModal}>
              Удалить
            </Button>
          )}
        </>
      }
      tabs={[
        { key: 'main', label: 'Основная информация' },
        { key: 'files', label: filesTabLabel },
        { key: 'comments', label: 'Комментарии' },
        { key: 'grants', label: `Охранные документы (${patentGrants.length})` },
      ]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Outlet context={patent} />
    </DetailPageHeader>
  );
}
