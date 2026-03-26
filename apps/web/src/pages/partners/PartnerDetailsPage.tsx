import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useContracts } from '../../api/contracts/contractApiHooks';
import { useFilesByEntity } from '../../api/files/fileApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useDeletePartner, usePartnerById, useRestorePartner } from '../../api/partners/partnerApiHooks';
import { usePartnerContacts } from '../../api/partners/partnerContactApiHooks';
import {
  usePartnerSupplierEvalKpi,
  useSupplierEvaluationsList,
} from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '../../constants/deletionScope';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useNotification } from '../../customhooks/useNotification';
import { PARTNERS_REGISTRY_PATH } from './constants/routes';
import {
  partnerDetailHeaderBadges,
  partnerDetailHeaderMetaItems,
} from './partnerDetailHeaderContent';
import { PARTNER_STATUS_BADGE_COLORS } from './partnerStatusBadgeColors';
import type { PartnerListTab } from './PartnersListPage.types';
import type { PartnersListNavSnapshot } from './utils/partnersListNavSnapshot';

export default function PartnerDetailsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: partner, isLoading, isError } = usePartnerById(partnerId!);
  const { data: references } = useReferenceData(['partnerStatuses', 'partnerTypes', 'partnerCategories']);
  const mutation = useDeletePartner();
  const restoreMutation = useRestorePartner();
  const navState = location.state as {
    deletionScope?: DeletionScope;
    partnersListReturn?: PartnersListNavSnapshot;
  } | null;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const partnersListReturn = navState?.partnersListReturn;
  const { data: contacts = [] } = usePartnerContacts(partnerId);
  const { data: files = [] } = useFilesByEntity('partner', partnerId!);
  const { data: contractsList } = useContracts(partnerId ? { partner_id: partnerId } : undefined, 1, 1, {
    enabled: Boolean(partnerId),
  });
  const { data: evaluationsCountData } = useSupplierEvaluationsList(
    { partner_id: partnerId, status: 'all', limit: 1, offset: 0 },
    Boolean(partnerId),
  );
  const evaluationsTotal = evaluationsCountData?.total ?? 0;
  const { data: partnerEvalKpi, isLoading: partnerEvalKpiLoading } = usePartnerSupplierEvalKpi(
    partnerId,
    Boolean(partnerId),
  );
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contacts';
    if (path.includes('/contracts')) return 'contracts';
    if (path.includes('/evaluations')) return 'evaluations';
    if (path.includes('/comments')) return 'comments';
    if (path.includes('/files')) return 'files';
    return 'main';
  };
  const activeTab = getActiveTabFromPath();
  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Контрагент успешно удалён',
    errorMessage: 'Не удалось удалить контрагента',
    getMutationProps: () => partnerId!,
    showNotification,
    redirectPath: PARTNERS_REGISTRY_PATH,
    redirectReplace: true,
    redirectState: { deletionScope: 'deleted' as const },
  });
  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreMutation,
    successMessage: 'Контрагент успешно восстановлен',
    errorMessage: 'Не удалось восстановить контрагента',
    getMutationProps: () => partnerId!,
    showNotification,
    redirectPath: PARTNERS_REGISTRY_PATH,
    redirectReplace: true,
    redirectState: { listTab: 'all' as PartnerListTab },
  });
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
      case 'evaluations':
        navigate(`${basePath}/evaluations`);
        break;
      case 'comments':
        navigate(`${basePath}/comments`);
        break;
      case 'files':
        navigate(`${basePath}/files`);
        break;
      default:
        navigate(basePath);
    }
  };

  if (isLoading) return <Loader />;
  if (isError || !partner) return <NotFound errorMessage='Контрагент не найден' />;
  const categoryName =
    references?.partnerCategories?.find(c => String(c.id) === String(partner.category_id))?.name ?? null;
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name;
  const tabItemsWithCounts = [
    { key: 'main', label: 'Основное' },
    { key: 'contacts', label: `Контактные лица (${contacts.length})` },
    { key: 'contracts', label: `Договоры (${contractsList?.total ?? 0})` },
    { key: 'evaluations', label: `Оценки проектов (${evaluationsTotal})` },
    { key: 'comments', label: 'Комментарии' },
    { key: 'files', label: `Файлы (${files.length})` },
  ];
  return (
    <DetailPageHeader
      title={partner.short_name || partner.name || 'Контрагент'}
      titleWeight='medium'
      backLabel='Реестр контрагентов'
      onBack={() =>
        navigate(PARTNERS_REGISTRY_PATH, {
          state: {
            deletionScope: listDeletionScope,
            ...(partnersListReturn ? { partnersListReturn } : {}),
          },
        })
      }
      statusBadge={
        partner.is_deleted
          ? { label: 'Удалён', color: '#ff4d4f' }
          : statusName
            ? {
                label: statusName,
                color: PARTNER_STATUS_BADGE_COLORS[statusName] ?? '#1677ff',
              }
            : undefined
      }
      badges={partnerDetailHeaderBadges(partner, { categoryName })}
      metaItems={partnerDetailHeaderMetaItems(partner, references, partnerEvalKpi, partnerEvalKpiLoading)}
      actions={
        <>
          <Button
            type='primary'
            icon={<EditOutlined />}
            disabled={!!partner.is_deleted}
            onClick={() => navigate(`/partners/${partnerId}/edit`)}
          >
            Редактировать
          </Button>
          {partner.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Восстановить
            </Button>
          ) : (
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleOpenModal}>
              Удалить
            </Button>
          )}
        </>
      }
      tabs={tabItemsWithCounts}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <Outlet context={partner} />
    </DetailPageHeader>
  );
}
