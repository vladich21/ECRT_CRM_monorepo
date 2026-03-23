import { useLocation, useNavigate, Outlet, useParams } from 'react-router-dom';
import { Button } from 'antd';
import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { useDeleteContract, useRestoreContract, useContractById } from '../../../api/contracts/contractApiHooks';
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
import { DEMO_ADDITIONAL_AGREEMENTS } from './tabs/additionalAgreements/ContractAdditionalAgreementsTab';
import { CONTRACTS_REGISTRY_PATH, getContractEditPath } from '../constants/routes';
import type { FilterTab } from '../list/ContractsListPage.types';
import type { DeletionScope } from '../../../constants/deletionScope';
import type { ContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';
export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();
  const navState = location.state as {
    from?: string;
    deletionScope?: DeletionScope;
    contractsListReturn?: ContractsListNavSnapshot;
  } | null;
  const from = navState?.from;
  const listDeletionScope = navState?.deletionScope ?? 'active';
  const contractsListReturn = navState?.contractsListReturn;
  const handleBack = () => {
    const backState: {
      deletionScope: DeletionScope;
      contractsListReturn?: ContractsListNavSnapshot;
    } = {
      deletionScope: listDeletionScope,
      ...(contractsListReturn ? { contractsListReturn } : {}),
    };
    if (typeof from === 'string' && from.length > 0) {
      navigate(from, { state: backState });
      return;
    }
    navigate(CONTRACTS_REGISTRY_PATH, { state: backState });
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
  const restoreContractMutation = useRestoreContract();
  const { handleOpenModal } = useConfirmByModal({
    mutation: deleteContractMutation,
    successMessage: 'Договор успешно удалён',
    errorMessage: 'Не удалось удалить договор',
    getMutationProps: () => contractId!,
    showNotification,
    redirectPath: CONTRACTS_REGISTRY_PATH,
    redirectReplace: true,
    redirectState: { deletionScope: 'deleted' as const },
  });
  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreContractMutation,
    successMessage: 'Договор успешно восстановлен',
    errorMessage: 'Не удалось восстановить договор',
    getMutationProps: () => contractId!,
    showNotification,
    redirectPath: CONTRACTS_REGISTRY_PATH,
    redirectReplace: true,
    redirectState: { listTab: 'all' as FilterTab },
  });
  const activeTab = getActiveContractDetailsTab(location.pathname);
  const tabsWithCounts = CONTRACT_DETAILS_TABS.map(tab => {
    if (tab.key === 'files') return { ...tab, count: contractFiles.length };
    if (tab.key === 'additional-agreements') {
      return { ...tab, count: DEMO_ADDITIONAL_AGREEMENTS.length };
    }
    return tab;
  });
  const handleEdit = () => {
    navigate(getContractEditPath(contractId!), { state: { from } });
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
  if (isError || !contract) return <NotFound errorMessage='Договор не найден' />;
  const stages = stagesData ?? [];
  const outletContext = { contract, stages };
  const contractState = getEntityById(contract.state_id, referenceBooks?.contractStates);
  const contractCategoryName = getNameById(contract.category_id, referenceBooks?.contractCategories ?? []) ?? '';
  const contractTypeName = getNameById(contract.contract_type_id, referenceBooks?.contractTypes ?? []) ?? '';
  const partnerName = getNameById(contract.partner_id, referenceBooks?.partners ?? []) ?? '';
  const daysUntilEnd = getDaysUntilDate(contract.end_date);
  const showDeadlineBanner = shouldShowDeadlineBanner(daysUntilEnd);
  const formattedEndDate = contract.end_date ? new Date(contract.end_date).toLocaleDateString('ru-RU') : '-';
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
      backLabel='Договоры'
      onBack={handleBack}
      statusBadge={{
        label: contract.is_deleted ? 'Удалён' : contract.is_active ? 'Действует' : 'Не действует',
        color: contract.is_deleted ? '#ff4d4f' : contract.is_active ? '#52c41a' : '#ff4d4f',
      }}
      metaItems={[
        contract.name && (
          <span key='name' className={hStyles.metaText}>
            {contract.name}
          </span>
        ),
        contractState && (
          <span
            key='state'
            className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
          >
            {contractState.name}
          </span>
        ),
        contractCategoryName && (
          <span key='category' className={tagStyles.cardCategory}>
            {contractCategoryName}
          </span>
        ),
        partnerName && (
          <span key='partner' className={hStyles.metaText}>
            {partnerName}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button type='primary' icon={<EditOutlined />} onClick={handleEdit} disabled={!!contract.is_deleted}>
            Редактировать
          </Button>
          {contract.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Восстановить
            </Button>
          ) : (
            <Button type='primary' danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Удалить
            </Button>
          )}
        </>
      }
      extraContent={
        showDeadlineBanner ? (
          <div className={styles.deadlineBanner}>
            Срок действия договора истекает через <strong>{daysUntilEnd} дн.</strong> — до{' '}
            <strong>{formattedEndDate}</strong>
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
