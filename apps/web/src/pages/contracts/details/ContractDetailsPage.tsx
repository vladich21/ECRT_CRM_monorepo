import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import type { Contract } from '@/types/contract';
import { APP_COLOR_SUCCESS } from '@/constants/appColors';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '@/constants/deletionScope';
import { resolveInternalReturnPath } from '@/helpers/internalReturnNavigation';
import { CONTRACTS_REGISTRY_PATH, getContractEditPath } from '../constants/routes';
import tagStyles from '../list/ContractsListPage.module.scss';
import {
  CONTRACT_DETAILS_TABS,
  formatProjectChipLabel,
  getActiveContractDetailsTab,
  getContractDetailsTabPath,
  type ContractDetailsTabKey,
} from '../utils/contractDetailsUtils';
import { getContractStateTagClass } from '../utils/contractStateUtils';
import styles from './ContractDetails.module.scss';
import { ContractDetailsAside } from './tabs/main/ContractDetailsAside';
import { useContractDetailsData } from './hooks/useContractDetailsData';
import { useContractDetailsActions } from './hooks/useContractDetailsActions';
import {
  buildContractDetailsBackLabel,
  buildContractDetailsStatusBadge,
  buildContractDetailsTitle,
} from './utils/contractDetailsHeaderUtils';

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const navState = location.state as {
    contract?: Contract;
    from?: string;
    deletionScope?: DeletionScope;
  } | null;
  const from = navState?.from;
  const initialContract =
    navState?.contract != null && navState.contract.id === contractId ? navState.contract : undefined;
  const detailNavBase = from ? { from } : {};
  const contractsListPath = resolveInternalReturnPath(from, CONTRACTS_REGISTRY_PATH);

  const {
    contract,
    referenceBooks,
    contractFiles,
    stages,
    contractState,
    contractCategoryName,
    contractTypeName,
    partnerName,
    projectEntity,
    showDeadlineBanner,
    daysUntilEnd,
    formattedEndDate,
    isLoading,
    isError,
  } = useContractDetailsData(contractId!, initialContract);

  const { handleDelete, openRestoreModal, contextHolder } = useContractDetailsActions(
    contractId!,
    contractsListPath,
    detailNavBase,
    contract,
    referenceBooks?.contractStates,
  );

  const activeTab = getActiveContractDetailsTab(location.pathname);

  const headerTabs = CONTRACT_DETAILS_TABS.map(tab => {
    let count: number | undefined;
    if (tab.key === 'files') count = contractFiles.length;
    return { key: tab.key, label: count !== undefined ? `${tab.label} (${count})` : tab.label };
  });

  if (isLoading) return <Loader />;
  if (isError || !contract) return <NotFound errorMessage='Договор не найден' />;

  const projectChipLabel = formatProjectChipLabel(projectEntity);

  return (
    <DetailPageHeader
      title={buildContractDetailsTitle(contract)}
      subtitle={
        (partnerName || contract.cipher || contractCategoryName) ? (
          <div className={styles.detailHeaderSubtitle}>
            {partnerName ? <span className={styles.detailHeaderPartner}>{partnerName}</span> : null}
            {contract.cipher ? (
              <span>
                {partnerName ? ' · ' : null}
                Шифр: {contract.cipher}
              </span>
            ) : null}
            {contractCategoryName ? (
              <span>
                {partnerName || contract.cipher ? ' · ' : null}
                Категория: {contractCategoryName}
              </span>
            ) : null}
          </div>
        ) : undefined
      }
      backLabel={buildContractDetailsBackLabel(from)}
      onBack={() => navigate(contractsListPath, from ? { state: { from } } : undefined)}
      statusBadge={buildContractDetailsStatusBadge(contract)}
      metaItems={[
        contractState && (
          <span
            key='state'
            className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
          >
            {contractState.name}
          </span>
        ),
        contractTypeName && (
          <span key='type' className={tagStyles.cardCategory}>
            {contractTypeName}
          </span>
        ),
        projectChipLabel && (
          <span key='project' className={[tagStyles.cardCategory, styles.detailHeaderProjectChip].join(' ')}>
            {projectChipLabel}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button
            type='primary'
            icon={<EditOutlined />}
            onClick={() => navigate(getContractEditPath(contractId!), navState != null ? { state: navState } : undefined)}
            disabled={!!contract.is_deleted}
          >
            Редактировать
          </Button>
          {contract.is_deleted ? (
            <Button
              type='primary'
              icon={<UndoOutlined />}
              onClick={openRestoreModal}
              style={{ backgroundColor: APP_COLOR_SUCCESS, borderColor: APP_COLOR_SUCCESS }}
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
            Срок действия договора истекает через <strong>{daysUntilEnd} дн.</strong> - до{' '}
            <strong>{formattedEndDate}</strong>
          </div>
        ) : undefined
      }
      tabs={headerTabs}
      activeTab={activeTab}
      onTabChange={tabKey => {
        if (contractId) {
          navigate(getContractDetailsTabPath(contractId, tabKey as ContractDetailsTabKey), {
            state: location.state,
          });
        }
      }}
      contextHolder={contextHolder}
    >
      <div className={activeTab === 'main' ? styles.contentWrap : styles.contentWrapFull}>
        <div className={styles.contentMain}>
          <Outlet context={{ contract, stages }} />
        </div>
        {activeTab === 'main' && (
          <ContractDetailsAside contract={contract} stages={stages} references={referenceBooks ?? null} />
        )}
      </div>
    </DetailPageHeader>
  );
}
