import { DeleteOutlined, EditOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPatentRidStatus } from '@/components/pageLayout/DetailPageHeader';
import {
  getInternalReturnBackLabel,
  resolveInternalReturnPath,
} from '@/helpers/internalReturnNavigation';
import listCardStyles from '@/pages/patents/PatentsListPage.module.scss';
import type { Patent } from '@/types/patent';
import type { ActionType } from './types/PatentsListPage.types';
import styles from './PatentDetails.module.scss';
import { usePatentDetailsActions } from './details/hooks/usePatentDetailsActions';
import { usePatentDetailsData } from './details/hooks/usePatentDetailsData';

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
    patent?: Patent;
    from?: string;
  } | null;
  const returnTab = navState?.tab === 'deleted' ? 'deleted' : 'all';
  const from = navState?.from?.trim();
  const backPath = resolveInternalReturnPath(from, '/patents');
  const backLabel = getInternalReturnBackLabel(backPath, 'Реестр РИД');
  const initialPatent =
    navState?.patent != null && navState.patent.id === patentId ? navState.patent : undefined;

  const {
    patent,
    patentComments,
    patentGrants,
    earliestRequestDeadline,
    ipTypeName,
    statusName,
    responsibleName,
    projectChipLabel,
    headerStatusLabel,
    title,
    filesTabLabel,
    isLoading,
    isError,
  } = usePatentDetailsData(patentId!, initialPatent);

  const { contextHolder, handleEdit, handleBack, openDeleteModal, openRestoreModal } =
    usePatentDetailsActions(patentId!, returnTab);

  const activeTab = getActiveTabFromPath(location.pathname);

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

  if (isLoading && !patent) return <Loader />;
  if (isError || !patent) return <NotFound errorMessage='Патент не найден' />;

  const headerStatusBadge = patent.is_deleted
    ? { label: 'Удален' as const, variant: 'danger' as const }
    : {
        label: headerStatusLabel,
        variant: detailHeaderVariantForPatentRidStatus(statusName, earliestRequestDeadline),
      };

  return (
    <DetailPageHeader
      title={title}
      titleWeight='medium'
      backLabel={backLabel}
      onBack={() => handleBack(backPath)}
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
