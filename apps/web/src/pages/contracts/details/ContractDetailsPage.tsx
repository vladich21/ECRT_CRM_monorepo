import { DeleteOutlined, EditOutlined, UndoOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useLayoutEffect } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';

import { useContractById, useDeleteContract, useRestoreContract } from '../../../api/contracts/contractApiHooks';
import { useContractStages } from '../../../api/contractStages/contractStagesApiHooks';
import { useFilesByEntity } from '../../../api/files/fileApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForContractHeader } from '../../../components/pageLayout/DetailPageHeader';
import type { DeletionScope } from '../../../constants/deletionScope';
import { useConfirmByModal } from '../../../customhooks/useConfirmByModal';
import { useNotification } from '../../../customhooks/useNotification';
import { getEntityById } from '../../../helpers/getEntityById';
import { getNameById } from '../../../helpers/getNameById';
import { CONTRACTS_REGISTRY_PATH, getContractEditPath } from '../constants/routes';
import tagStyles from '../list/ContractsListPage.module.scss';
import type { FilterTab } from '../list/ContractsListPage.types';
import {
  CONTRACT_DETAILS_TABS,
  formatContractDetailPageHeading,
  formatProjectChipLabel,
  getActiveContractDetailsTab,
  getContractDetailsTabPath,
  getDaysUntilDate,
  shouldShowDeadlineBanner,
  type ContractDetailsTabKey,
} from '../utils/contractDetailsUtils';
import type { ContractDeleteResult } from '../../../api/contracts/contractApi';
import type { ContractsListNavSnapshot } from '../utils/contractsListNavSnapshot';
import { getContractStateTagClass, isContractDraft } from '../utils/contractStateUtils';
import styles from './ContractDetails.module.scss';
import { DEMO_ADDITIONAL_AGREEMENTS } from './tabs/additionalAgreements/ContractAdditionalAgreementsTab';
import { ContractDetailsAside } from './tabs/main/ContractDetailsAside';

export default function ContractDetailsPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [contractId]);
  const { contextHolder, showNotification } = useNotification();
  const navState = location.state as {
    from?: string;
    deletionScope?: DeletionScope;
    contractsListReturn?: ContractsListNavSnapshot;
  } | null;
  const from = navState?.from;
  /** Снимок для редиректа после удаления/восстановления: всё из state списка + переопределённые поля. */
  const detailNavBase = typeof navState === 'object' && navState !== null ? navState : {};

  /** Список договоров: общий реестр или вкладка контрагента `/partners/:id/contracts`. */
  const contractsListPath =
    typeof from === 'string' && from.trim().length > 0 ? from : CONTRACTS_REGISTRY_PATH;

  const handleBack = () => {
    navigate(contractsListPath, navState != null ? { state: navState } : undefined);
  };
  const { data: contract, isLoading, isError } = useContractById(contractId!);
  const { data: referenceBooks } = useReferenceData([
    'contractStates',
    'contractCategories',
    'contractTypes',
    'partners',
    'projects',
    'users',
  ]);
  const { data: contractFiles = [] } = useFilesByEntity('contract', contractId!);
  const { data: stagesData } = useContractStages(contractId ?? '');
  const deleteContractMutation = useDeleteContract();
  const restoreContractMutation = useRestoreContract();
  const { handleOpenModal } = useConfirmByModal<ContractDeleteResult>({
    mutation: deleteContractMutation,
    successMessage: (data: ContractDeleteResult) =>
      data.deletion_mode === 'hard'
        ? 'Черновик удалён безвозвратно'
        : 'Договор перемещён в удалённые',
    errorMessage: 'Не удалось удалить договор',
    getMutationProps: () => contractId!,
    showNotification,
    redirectPath: contractsListPath,
    redirectReplace: true,
    redirectState: (data: ContractDeleteResult) => ({
      ...detailNavBase,
      deletionScope: data.deletion_mode === 'hard' ? ('active' as const) : ('deleted' as const),
    }),
  });
  const { handleOpenModal: openRestoreModal } = useConfirmByModal({
    mutation: restoreContractMutation,
    successMessage: 'Договор успешно восстановлен',
    errorMessage: 'Не удалось восстановить договор',
    getMutationProps: () => contractId!,
    showNotification,
    redirectPath: contractsListPath,
    redirectReplace: true,
    redirectState: {
      ...detailNavBase,
      listTab: 'all' as FilterTab,
    },
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
    navigate(getContractEditPath(contractId!), navState != null ? { state: navState } : undefined);
  };
  const handleDelete = () => {
    if (!contract) return;
    if (isContractDraft(contract.state_id, referenceBooks?.contractStates)) {
      handleOpenModal({
        title: 'Удалить черновик безвозвратно?',
        content:
          'Черновик договора будет удалён навсегда. Восстановить его нельзя — запись исчезнет из системы.',
        okText: 'Удалить навсегда',
        confirmAppearance: 'delete',
      });
    } else {
      handleOpenModal();
    }
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
  const title = formatContractDetailPageHeading(contract);
  const projectEntity = getEntityById(contract.project_id, referenceBooks?.projects);
  const projectChipLabel = formatProjectChipLabel(projectEntity);
  const hasHeaderSubtitle = !!(partnerName || contract.cipher || contractCategoryName);
  const headerTabs = tabsWithCounts.map(({ key, label, count }) => ({
    key,
    label: count !== undefined ? `${label} (${count})` : label,
  }));
  return (
    <DetailPageHeader
      title={title}
      subtitle={
        hasHeaderSubtitle ? (
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
      backLabel={
        typeof from === 'string' && from.includes('/partners/') && from.includes('/contracts')
          ? 'К договорам контрагента'
          : 'Договоры'
      }
      onBack={handleBack}
      statusBadge={{
        label: contract.is_deleted ? 'Удалён' : contract.is_active ? 'Действует' : 'Не действует',
        variant: detailHeaderVariantForContractHeader(!!contract.is_deleted, !!contract.is_active),
      }}
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
          <Button type='primary' icon={<EditOutlined />} onClick={handleEdit} disabled={!!contract.is_deleted}>
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
