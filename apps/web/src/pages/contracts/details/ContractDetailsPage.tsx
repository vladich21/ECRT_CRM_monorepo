import { useLocation, useNavigate, Outlet, useParams } from 'react-router-dom';
import { useDeleteContract, useContractById } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { ContractDetailsHeader } from './components/ContractDetailsHeader';
import { ContractDetailsTabs } from './components/ContractDetailsTabs';
import { ContractDetailsAside } from './tabs/main/ContractDetailsAside';
import styles from './ContractDetails.module.scss';
import { isContractDraft } from '../utils/contractStateUtils';
import { useFilesByEntity } from '../../../api/files/fileApiHooks';
import {
  CONTRACT_DETAILS_TABS,
  getActiveContractDetailsTab,
  getContractDetailsTabPath,
  getDaysUntilDate,
  shouldShowDeadlineBanner,
  type ContractDetailsTabKey,
} from '../utils/contractDetailsUtils';
import { BackButton } from '@/components/backButton/BackButton';

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { contextHolder, showNotification } = useNotification();

  const { data: contract, isLoading, isError } = useContractById(contractId!);
  const { data: referenceBooks } = useReferenceData([
    'contractStates',
    'contractCategories',
    'partners',
    'users',
  ]);

  const { data: contractFiles = [] } = useFilesByEntity('contract', contractId!);

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
    navigate(`/contracts/${contractId}/edit`);
  };

  const handleDelete = () => {
    if (isContractDraft(contract?.state_id, referenceBooks?.contractStates)) {
      showNotification('error', 'Ошибка', 'Черновики удалять нельзя');
      return;
    }

    handleOpenModal();
  };

  const handleTabChange = (tabKey: ContractDetailsTabKey) => {
    if (!contractId) return;
    navigate(getContractDetailsTabPath(contractId, tabKey));
  };

  if (isLoading) {
    return <Loader />;
  }

  if (isError || !contract) {
    return <NotFound errorMessage="Договор не найден" />;
  }

  const contractState = getEntityById(contract.state_id, referenceBooks?.contractStates);
  const contractCategoryName =
    getNameById(contract.category_id, referenceBooks?.contractCategories ?? []) ?? '';
  const partnerName = getNameById(contract.partner_id, referenceBooks?.partners ?? []) ?? '';

  const daysUntilEnd = getDaysUntilDate(contract.end_date);
  const showDeadlineBanner = shouldShowDeadlineBanner(daysUntilEnd);
  const formattedEndDate = contract.end_date
    ? new Date(contract.end_date).toLocaleDateString('ru-RU')
    : '-';

  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={styles.pageBackRow}>
        <BackButton onClick={() => navigate('/contracts')} />
      </div>

      <div className={styles.detailsBlock}>
        <ContractDetailsHeader
          contractNumber={contract.number}
          contractName={contract.name}
          contractCipher={contract.cipher}
          isContractActive={contract.is_active}
          contractState={contractState}
          contractCategoryName={contractCategoryName}
          partnerName={partnerName}
          daysUntilEnd={daysUntilEnd}
          formattedEndDate={formattedEndDate}
          shouldShowDeadlineBanner={showDeadlineBanner}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />

        <ContractDetailsTabs
          activeTab={activeTab}
          tabs={tabsWithCounts}
          onChange={handleTabChange}
        />
      </div>

      <div className={activeTab === 'main' ? styles.contentWrap : styles.contentWrapFull}>
        <div className={styles.contentMain}>
          <Outlet context={contract} />
        </div>

        {activeTab === 'main' && (
          <ContractDetailsAside contract={contract} references={referenceBooks ?? null} />
        )}
      </div>
    </div>
  );
}
