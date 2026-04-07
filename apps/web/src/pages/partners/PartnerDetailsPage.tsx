import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useDeletePartner, useRestorePartner } from '../../api/partners/partnerApiHooks';
import { APP_COLOR_SUCCESS } from '../../constants/appColors';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPartnerStatusName } from '../../components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '../../constants/deletionScope';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { useNotification } from '../../customhooks/useNotification';
import { usePartnerDetailsData } from './details/hooks/usePartnerDetailsData';
import { PARTNERS_REGISTRY_PATH } from './constants/routes';
import {
  partnerDetailHeaderBadges,
  partnerDetailHeaderMetaItems,
} from './partnerDetailHeaderContent';
import type { PartnerListTab } from './PartnersListPage.types';
import type { PartnersListNavSnapshot } from './utils/partnersListNavSnapshot';

export default function PartnerDetailsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const mutation = useDeletePartner();
  const restoreMutation = useRestorePartner();
  const navState = location.state as {
    deletionScope?: DeletionScope;
    partnersListReturn?: PartnersListNavSnapshot;
  } | null;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const partnersListReturn = navState?.partnersListReturn;

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
  } = usePartnerDetailsData(partnerId, location.pathname);

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
      case 'verification':
        navigate(`${basePath}/verification`);
        break;
      default:
        navigate(basePath);
    }
  };

  if (isLoading) return <Loader />;
  if (isError || !partner) return <NotFound errorMessage='Контрагент не найден' />;

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
          ? { label: 'Удалён', variant: 'danger' }
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
            onClick={() => navigate(`/partners/${partnerId}/edit`)}
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
