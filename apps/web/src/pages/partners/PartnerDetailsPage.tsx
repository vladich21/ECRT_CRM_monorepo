import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { Button, Tooltip } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  UndoOutlined,
  BankOutlined,
  StarFilled,
  AimOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
} from '@ant-design/icons';
import { useDeletePartner, useRestorePartner, usePartnerById } from '../../api/partners/partnerApiHooks';
import { useReferenceData } from '../../api/hooks/useReferences';
import { NotFound } from '../../components/notFound/NotFound';
import { Loader } from '../../components/loader/Loader';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { detailPageHeaderStyles as hStyles } from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { useConfirmByModal } from '../../customhooks/useConfirmByModal';
import { usePartnerContacts } from '../../api/partners/partnerContactApiHooks';
import { useFilesByEntity } from '../../api/files/fileApiHooks';
import { useContracts } from '../../api/contracts/contractApiHooks';
import { PARTNERS_REGISTRY_PATH } from './constants/routes';
import type { DeletionScope } from '../../constants/deletionScope';
import type { PartnerListTab } from './PartnersListPage.types';
import type { PartnersListNavSnapshot } from './utils/partnersListNavSnapshot';
const STATUS_COLORS: Record<string, string> = {
  Активный: '#52c41a',
  Потенциальный: '#1677ff',
  Заблокирован: '#ff4d4f',
  Архив: '#8c8c8c',
};

export default function PartnerDetailsPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const { data: partner, isLoading, isError } = usePartnerById(partnerId!);
  const { data: references } = useReferenceData(['partnerStatuses', 'partnerTypes']);
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
  const getActiveTabFromPath = () => {
    const path = location.pathname;
    if (path.includes('/contacts')) return 'contacts';
    if (path.includes('/contracts')) return 'contracts';
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
  const statusName = references?.partnerStatuses?.find(s => s.id === partner.status_id)?.name;
  const typeNames = (partner.type_ids ?? [])
    .map(id => references?.partnerTypes?.find(t => t.id === id)?.name)
    .filter(Boolean);
  const tabItemsWithCounts = [
    { key: 'main', label: 'Основное' },
    { key: 'contacts', label: `Контактные лица (${contacts.length})` },
    { key: 'contracts', label: `Договоры (${contractsList?.total ?? 0})` },
    { key: 'comments', label: 'Комментарии' },
    { key: 'files', label: `Файлы (${files.length})` },
  ];
  return (
    <DetailPageHeader
      title={partner.short_name || partner.name || 'Контрагент'}
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
                color: STATUS_COLORS[statusName] ?? '#1677ff',
              }
            : undefined
      }
      badges={
        [
          <Tooltip
            key='approved'
            title={
              partner.is_approved
                ? 'Утверждён: юр. проверка, анкета, первичная оценка пройдены'
                : 'Не утверждён: не все проверки пройдены'
            }
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                background: partner.is_approved ? 'rgba(82,196,26,0.1)' : 'rgba(255,77,79,0.1)',
                color: partner.is_approved ? '#52c41a' : '#ff4d4f',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {partner.is_approved ? (
                <CheckCircleFilled style={{ fontSize: 12 }} />
              ) : (
                <ClockCircleFilled style={{ fontSize: 12 }} />
              )}
              {partner.is_approved ? 'Утверждён' : 'Не утверждён'}
            </div>
          </Tooltip>,
          partner.is_key_supplier && (
            <div
              key='key'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(250,173,20,0.1)',
                color: '#faad14',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <StarFilled style={{ fontSize: 12 }} />
              Ключевой
            </div>
          ),
          partner.is_targeted && (
            <div
              key='target'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 12,
                background: 'rgba(22,119,255,0.1)',
                color: '#1677ff',
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <AimOutlined style={{ fontSize: 12 }} />
              Целевой
            </div>
          ),
        ].filter(Boolean) as React.ReactNode[]
      }
      metaItems={
        [
          partner.inn && (
            <span key='inn' className={hStyles.metaText}>
              <BankOutlined /> ИНН {partner.inn}
            </span>
          ),
          typeNames.length > 0 && (
            <span key='types' className={hStyles.metaText}>
              {typeNames.join(', ')}
            </span>
          ),
          partner.actual_address && (
            <span key='addr' className={hStyles.metaText}>
              {partner.actual_address}
            </span>
          ),
        ].filter(Boolean) as React.ReactNode[]
      }
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
