import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDeletePartner, useRestorePartner } from '@/api/partners/partnerApiHooks';
import { APP_COLOR_SUCCESS } from '@/constants/appColors';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPartnerStatusName } from '@/components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '@/constants/deletionScope';
import { useConfirmByModal } from '@/hooks/modals/useConfirmByModal';
import { useNotification } from '@/hooks/notifications/useNotification';
import { isSafeInternalReturnPath, getInternalReturnBackLabel } from '@/helpers/internalReturnNavigation';
import type { Partner } from '@/types/partner';
import { usePartnerDetailsData } from './details/hooks/usePartnerDetailsData';
import { PARTNERS_REGISTRY_PATH } from './constants/routes';
import {
  partnerDetailHeaderBadges,
  partnerDetailHeaderMetaItems,
} from './partnerDetailHeaderContent';

export default function PartnerDetailsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const mutation = useDeletePartner();
  const restoreMutation = useRestorePartner();
  const navState = location.state as {
    partner?: Partner;
    deletionScope?: DeletionScope;
    returnToAfterPartner?: string;
  } | null;
  const initialPartner =
    navState?.partner != null && navState.partner.id === partnerId ? navState.partner : undefined;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const returnToAfterPartnerRaw = navState?.returnToAfterPartner?.trim();
  const returnToAfterPartner =
    returnToAfterPartnerRaw && isSafeInternalReturnPath(returnToAfterPartnerRaw)
      ? returnToAfterPartnerRaw
      : undefined;

  const {
    partner,
    isLoading,
    isError,
    references,
    activeTab,
    tabItemsWithCounts,
    categoryName,
    statusName,
    partnerEvalKpi,
    partnerEvalKpiLoading,
    initialEval,
    initialEvalLoading,
  } = usePartnerDetailsData(partnerId, location.pathname, initialPartner);

  const { handleOpenModal } = useConfirmByModal({
    mutation,
    successMessage: 'Контрагент успешно удален',
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
  });

  const tabNavigateOpts =
    location.state != null && typeof location.state === 'object'
      ? { state: location.state as Record<string, unknown> }
      : undefined;

  const handleTabChange = (key: string) => {
    const basePath = `/partners/${partnerId}`;
    const tabPathByKey: Record<string, string> = {
      main: basePath,
      contacts: `${basePath}/contacts`,
      contracts: `${basePath}/contracts`,
      evaluations: `${basePath}/evaluations`,
      comments: `${basePath}/comments`,
      files: `${basePath}/files`,
      verification: `${basePath}/verification`,
    };
    navigate(tabPathByKey[key] ?? basePath, tabNavigateOpts);
  };

  if (isLoading && !partner) return <Loader />;
  if (isError || !partner) return <NotFound errorMessage='Контрагент не найден' />;

  const backLabel =
    returnToAfterPartner === '/supplier-evaluations'
      ? 'Реестр оценок поставщиков'
      : returnToAfterPartner
        ? getInternalReturnBackLabel(returnToAfterPartner, 'Назад')
        : 'Реестр контрагентов';

  const handleBack = () => {
    if (returnToAfterPartner) {
      navigate(returnToAfterPartner);
      return;
    }
    navigate(PARTNERS_REGISTRY_PATH, {
      state: { deletionScope: listDeletionScope },
    });
  };

  return (
    <DetailPageHeader
      title={partner.short_name || partner.name || 'Контрагент'}
      titleWeight='medium'
      backLabel={backLabel}
      onBack={handleBack}
      statusBadge={
        partner.is_deleted
          ? { label: 'Удален', variant: 'danger' }
          : statusName
            ? { label: statusName, variant: detailHeaderVariantForPartnerStatusName(statusName) }
            : undefined
      }
      badges={partnerDetailHeaderBadges(partner, { categoryName })}
      metaItems={partnerDetailHeaderMetaItems(
        partner,
        references,
        partnerEvalKpi,
        partnerEvalKpiLoading,
        initialEval,
        initialEvalLoading,
      )}
      actions={
        <>
          <Button
            type='primary'
            icon={<EditOutlined />}
            disabled={!!partner.is_deleted}
            onClick={() =>
              navigate(`/partners/${partnerId}/edit`, {
                state: location.state ?? undefined,
              })
            }
          >
            Редактировать
          </Button>
          {partner.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: APP_COLOR_SUCCESS, borderColor: APP_COLOR_SUCCESS }}
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
