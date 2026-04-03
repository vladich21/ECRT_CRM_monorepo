import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '../../../constants/deletionScope';
import { CONTRACTS_REGISTRY_PATH, getContractEditPath } from '../constants/routes';
import tagStyles from '../list/ContractsListPage.module.scss';
import {
  CONTRACT_DETAILS_TABS,
  formatProjectChipLabel,
  getActiveContractDetailsTab,
  getContractDetailsTabPath,
  type ContractDetailsTabKey,
} from '../utils/contractDetailsUtils';
import type { ContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';
import { getContractStateTagClass } from '../utils/contractStateUtils';
import styles from './ContractDetails.module.scss';
import { DEMO_ADDITIONAL_AGREEMENTS } from './tabs/additionalAgreements/ContractAdditionalAgreementsTab';
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

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [contractId]);

  const navState = location.state as {
    from?: string;
    deletionScope?: DeletionScope;
    contractsListReturn?: ContractsListNavSnapshot;
  } | null;
  const from = navState?.from;
  const detailNavBase = navState ?? {};
  const contractsListPath = from || CONTRACTS_REGISTRY_PATH;

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
  } = useContractDetailsData(contractId!);

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
    if (tab.key === 'additional-agreements') count = DEMO_ADDITIONAL_AGREEMENTS.length;
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
      onBack={() => navigate(contractsListPath, navState != null ? { state: navState } : undefined)}
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
            <Button type='primary' icon={<UndoOutlined />} onClick={openRestoreModal} className={styles.restoreActionBtn}>
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
      onTabChange={tabKey => {
        if (contractId) navigate(getContractDetailsTabPath(contractId, tabKey as ContractDetailsTabKey));
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
