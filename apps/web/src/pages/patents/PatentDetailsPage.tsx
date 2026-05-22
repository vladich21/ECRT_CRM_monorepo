import { DeleteOutlined, EditOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { useComments } from '@/api/comments/commentApiHooks';
import { useDeletePatent, usePatentById, useRestorePatent } from '@/api/patents/patentApiHooks';
import { usePatentGrants } from '@/api/patents/patentGrantsApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPatentRidStatus } from '@/components/pageLayout/DetailPageHeader';
import { useConfirmByModal } from '@/customhooks/useConfirmByModal';
import { useNotification } from '@/customhooks/useNotification';
import { getEntityById } from '@/helpers/getEntityById';
import {
  getInternalReturnBackLabel,
  resolveInternalReturnPath,
} from '@/helpers/internalReturnNavigation';
import { getNameById } from '@/helpers/getNameById';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import { formatPatentRegistryCardHeading } from '@/pages/patents/utils/patentRegistryCardUtils';
import {
  earliestPatentRequestsDeadlineFromFiles,
  formatPatentStatusDisplayName,
} from '@/pages/patents/utils/patentStatusDisplay';
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
    from?: string;
  } | null;
  const returnTab = navState?.tab === 'deleted' ? 'deleted' : 'all';
  const patentsListReturn = navState?.patentsListReturn;
  const from = navState?.from?.trim();
  const backPath = resolveInternalReturnPath(from, '/patents');
  const backLabel = getInternalReturnBackLabel(backPath, 'Реестр РИД');
  const { contextHolder, showNotification } = useNotification();
  const { data: patent, isLoading, isError } = usePatentById(patentId!);
  const { data: patentFiles, isLoading: isPatentFilesLoading } = useFilesByEntity('patent', patentId!);
  const { data: patentComments = [] } = useComments('patent', patentId);
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
    successMessage: 'Патент успешно удален',
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
    const navOpts = { state: location.state };
    switch (key) {
      case 'files':
        navigate(`${basePath}/files`, navOpts);
        break;
      case 'comments':
        navigate(`${basePath}/comments`, navOpts);
        break;
      case 'grants':
        navigate(`${basePath}/grants`, navOpts);
        break;
      default:
        navigate(basePath, navOpts);
    }
  };
  const handleBack = () => {
    if (backPath !== '/patents') {
      navigate(backPath, navState != null ? { state: navState } : undefined);
      return;
    }
    navigate('/patents', {
      state: {
        tab: returnTab,
        ...(patentsListReturn ? { patentsListReturn } : {}),
      },
    });
  };

  const earliestRequestDeadline = useMemo(
    () => earliestPatentRequestsDeadlineFromFiles(patentFiles),
    [patentFiles],
  );

  if (isLoading) return <Loader />;
  if (isError || !patent) return <NotFound errorMessage='Патент не найден' />;
  const ipTypeName = getNameById(patent.intellectprop_id, referenceBooks?.patentIntellectProps) || '';
  const statusName = getNameById(patent.status_id, referenceBooks?.patentStatuses) || '';
  const responsibleName =
    getNameById(patent.responsible_for_patenting_id, referenceBooks?.users ?? []) || '—';
  const projectEntity = getEntityById(patent.project_id, referenceBooks?.projects ?? []);
  const projectChipLabel = formatProjectChipLabel(projectEntity);
  const headerStatusBadge = patent.is_deleted
    ? { label: 'Удален' as const, variant: 'danger' as const }
    : {
        label: formatPatentStatusDisplayName(statusName, earliestRequestDeadline) || 'Статус не указан',
        variant: detailHeaderVariantForPatentRidStatus(statusName, earliestRequestDeadline),
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
      backLabel={backLabel}
      onBack={handleBack}
      statusBadge={headerStatusBadge}
      subtitle={
        <div className={styles.detailHeaderSubtitle}>
          <UserOutlined style={{ fontSize: 14 }} />
          <span className={styles.detailHeaderResponsibleLabel}>Ответственный за патентование:</span>
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
        { key: 'comments', label: `Комментарии (${patentComments.length})` },
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
