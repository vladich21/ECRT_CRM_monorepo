import { useLocation, useNavigate, Outlet, useParams } from 'react-router-dom';
import { Button } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { useDeleteContract, useContractById } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { ContractDetailsAside } from './tabs/main/ContractDetailsAside';
import styles from './ContractDetails.module.scss';
import { isContractDraft, getContractStateTagClass } from '../utils/contractStateUtils';
import { useFilesByEntity } from '../../../api/files/fileApiHooks';
import { formatDate } from './tabs/stages/data';
import {
  CONTRACT_DETAILS_TABS,
  getActiveContractDetailsTab,
  getContractDetailsTabPath,
  getDaysUntilDate,
  shouldShowDeadlineBanner,
  type ContractDetailsTabKey,
} from '../utils/contractDetailsUtils';
import tagStyles from '../list/ContractsListPage.module.scss';
import { useContractStages } from '../../../api/contractStages/contractStagesApiHooks';

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();

  const from = (location.state as any)?.from as string | undefined;
  const handleBack = () => {
    if (typeof from === 'string' && from.length > 0) {
      navigate(from);
      return;
    }
    navigate('/contracts');
  };

  const { data: contract, isLoading, isError } = useContractById(contractId!);
  const { data: referenceBooks } = useReferenceData([
    'contractStates',
    'contractCategories',
    'contractTypes',
    'partners',
    'users',
  ]);

  const { data: contractFiles = [] } = useFilesByEntity('contract', contractId!);
  const { data: stagesData } = useContractStages(contractId ?? '');

  const deleteContractMutation = useDeleteContract();

  const { handleOpenModal } = useConfirmByModal({
    mutation: deleteContractMutation,
    successMessage: 'Договор успешно удалён',
    errorMessage: 'Не удалось удалить договор',
    redirectPath: '/contracts',
    getMutationProps: () => contractId!,
    showNotification,
  });

  const activeTab = getActiveContractDetailsTab(location.pathname);

  const tabsWithCounts = CONTRACT_DETAILS_TABS.map((tab) =>
    tab.key === 'files' ? { ...tab, count: contractFiles.length } : tab
  );

  const handleEdit = () => {
    navigate(`/contracts/${contractId}/edit`, { state: { from } });
  };

  const handleDelete = () => {
    if (isContractDraft(contract?.state_id, referenceBooks?.contractStates)) {
      showNotification('error', 'Ошибка', 'Черновики удалять нельзя');
      return;
    }
    handleOpenModal();
  };

  const handleTabChange = (tabKey: string) => {
    if (!contractId) return;
    navigate(getContractDetailsTabPath(contractId, tabKey as ContractDetailsTabKey));
  };

  if (isLoading) return <Loader />;
  if (isError || !contract) return <NotFound errorMessage="Договор не найден" />;

  const stages = stagesData ?? [];
  const outletContext = { contract, stages };

  const contractState = getEntityById(contract.state_id, referenceBooks?.contractStates);
  const contractCategoryName =
    getNameById(contract.category_id, referenceBooks?.contractCategories ?? []) ?? '';
  const contractTypeName =
    getNameById(contract.contract_type_id, referenceBooks?.contractTypes ?? []) ?? '';
  const partnerName = getNameById(contract.partner_id, referenceBooks?.partners ?? []) ?? '';

  const daysUntilEnd = getDaysUntilDate(contract.end_date);
  const showDeadlineBanner = shouldShowDeadlineBanner(daysUntilEnd);
  const formattedEndDate = contract.end_date
    ? new Date(contract.end_date).toLocaleDateString('ru-RU')
    : '-';

  const title = `Договор №${contract.number}${contract.cipher ? ` (${contract.cipher})` : ''}`;

  const headerTabs = tabsWithCounts.map(({ key, label, count }) => ({
    key,
    label: count !== undefined ? `${label} (${count})` : label,
  }));

  return (
    <DetailPageHeader
      title={title}
      titleSuffix={
        <>
          {contractTypeName ? <span className={hStyles.metaText}>{contractTypeName}</span> : null}
          {contract.date_signed ? (
            <span className={hStyles.metaText}>Подписан: {formatDate(contract.date_signed)}</span>
          ) : null}
        </>
      }
      backLabel="Договоры"
      onBack={handleBack}
      statusBadge={{
        label: contract.is_active ? 'Действует' : 'Не действует',
        color: contract.is_active ? '#52c41a' : '#ff4d4f',
      }}
      metaItems={[
        contract.name && (
          <span key="name" className={hStyles.metaText}>{contract.name}</span>
        ),
        contractState && (
          <span
            key="state"
            className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
          >
            {contractState.name}
          </span>
        ),
        contractCategoryName && (
          <span key="category" className={tagStyles.cardCategory}>{contractCategoryName}</span>
        ),
        partnerName && (
          <span key="partner" className={hStyles.metaText}>{partnerName}</span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
            Редактировать
          </Button>
          <Button type="primary" danger icon={<DeleteOutlined />} onClick={handleDelete}>
            Удалить
          </Button>
        </>
      }
      extraContent={
        showDeadlineBanner ? (
          <div className={styles.deadlineBanner}>
            Срок действия договора истекает через{' '}
            <strong>{daysUntilEnd} дн.</strong>{' '}
            — до <strong>{formattedEndDate}</strong>
          </div>
        ) : undefined
      }
      tabs={headerTabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      contextHolder={contextHolder}
    >
      <div className={activeTab === 'main' ? styles.contentWrap : styles.contentWrapFull}>
        <div className={styles.contentMain}>
          <Outlet context={outletContext} />
        </div>

        {activeTab === 'main' && (
          <ContractDetailsAside contract={contract} stages={stages} references={referenceBooks ?? null} />
        )}
      </div>
    </DetailPageHeader>
  );
}
