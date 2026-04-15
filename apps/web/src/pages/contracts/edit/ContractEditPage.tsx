import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useContractById, useUpdateContract } from '@/api/contracts/contractApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import { useNotification } from '@/customhooks/useNotification';
import { getChangedFields } from '@/helpers/getChangedFields';
import { getEntityById } from '@/helpers/getEntityById';
import { formReferenceId } from '@/helpers/formReferenceId';
import { getNameById } from '@/helpers/getNameById';
import { contractUpdateFormMapper } from '@/helpers/mappers/contractUpdateFormMapper';
import {
  ContractFormClassificationFields,
  ContractFormDateFields,
  ContractFormMainFields,
  ContractFormMoneyFields,
  ContractFormStateFields,
  type ContractFormRefs,
} from '../components/form';
import { applyVatDerivedAmounts } from '../create/contractCreateFormUtils';
import styles from '../create/ContractCreatePage.module.scss';
import { normalizeDraftDateFields } from '@/utils/normalizeDraftDateFields';
import tagStyles from '../list/ContractsListPage.module.scss';
import detailsStyles from '../details/ContractDetails.module.scss';
import {
  buildContractDetailsBackLabel,
  buildContractDetailsStatusBadge,
  buildContractDetailsTitle,
} from '../details/utils/contractDetailsHeaderUtils';
import {
  formatProjectChipLabel,
  getDaysUntilDate,
  shouldShowDeadlineBanner,
} from '../utils/contractDetailsUtils';
import { getContractStateTagClass, isContractDraft, isContractSignedState } from '../utils/contractStateUtils';
import { applyDayjsDateFieldsToPayload } from './contractEditFormUtils';
import { useContractEditFormWatchers } from './hooks/useContractEditFormWatchers';

const CONTRACT_EDIT_DRAFT_DATE_FIELDS = ['start_date', 'end_date', 'date_signed'] as const;

const getContractEditDraftKey = (contractId: string) => `contract-edit-draft-${contractId}`;

type ContractEditLocationState = {
  createdPartnerId?: string;
  restoreContractDraft?: boolean;
};

export default function ContractEditPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const locationStateRef = useRef(location.state as ContractEditLocationState | null);
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: contract, isLoading: isContractLoading, isError: isContractError } = useContractById(contractId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
    refetch: refetchReferences,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const { mutate, isPending: isUpdateLoading } = useUpdateContract();
  const {
    number: watchContractNumber,
    cipher: watchCipher,
    name: watchContractName,
    category_id: watchCategoryId,
    contract_type_id: watchContractTypeId,
    state_id: watchStateId,
    partner_id: watchPartnerId,
    project_id: watchProjectId,
    date_signed: watchDateSigned,
    end_date: watchEndDate,
  } = useContractEditFormWatchers(form);

  const isFormInitializedRef = useRef(false);

  useEffect(() => {
    if (!contract || isFormInitializedRef.current) return;
    isFormInitializedRef.current = true;

    const locationState = locationStateRef.current;
    const draftKey = getContractEditDraftKey(contractId!);
    const draftRaw = locationState?.restoreContractDraft ? sessionStorage.getItem(draftKey) : null;

    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Record<string, unknown>;
        form.setFieldsValue(normalizeDraftDateFields(draft, CONTRACT_EDIT_DRAFT_DATE_FIELDS));
      } catch {
        form.setFieldsValue(contractUpdateFormMapper(contract));
      }
      sessionStorage.removeItem(draftKey);

      void refetchReferences().then(() => {
        if (locationState?.createdPartnerId) {
          form.setFieldValue('partner_id', locationState.createdPartnerId);
        }
      });

      navigate(location.pathname, { replace: true, state: undefined });
    } else {
      form.setFieldsValue(contractUpdateFormMapper(contract));
    }
  }, [contract, contractId, form, location.pathname, navigate, refetchReferences]);

  const handleCreatePartnerFromContract = () => {
    sessionStorage.setItem(getContractEditDraftKey(contractId!), JSON.stringify(form.getFieldsValue(true)));
    navigate('/partners/create', {
      state: {
        fromContractCreate: true,
        returnPath: location.pathname,
      },
    });
  };

  const handleBack = () =>
    navigate(`/contracts/${contractId}`, location.state != null ? { state: location.state } : undefined);

  const handleProjectChange = (project: { manager_id?: string | null; purchaser_id?: string | null } | null) => {
    if (!isFormInitializedRef.current) return;
    form.setFieldsValue({
      responsible_id: project?.manager_id ?? null,
      supplier_manager_id: project?.purchaser_id ?? null,
    });
  };

  const handleAmountChange = (value: number | null) => {
    const vatRate = form.getFieldValue('vat_rate');
    if (value != null && vatRate != null) {
      applyVatDerivedAmounts(form, value, Number(vatRate));
    }
  };

  const handleVatRateChange = (value: number | null) => {
    const amountExcl = form.getFieldValue('amount_excl_vat');
    if (value != null && amountExcl != null) {
      applyVatDerivedAmounts(form, Number(amountExcl), value);
    }
  };

  const isSubmittingRef = useRef(false);

  const handleSave = (values: Record<string, unknown>) => {
    if (isSubmittingRef.current || !contract) return;
    isSubmittingRef.current = true;
    const rawChanged = getChangedFields(values, contractUpdateFormMapper(contract)) as Record<string, unknown>;
    const data = applyDayjsDateFieldsToPayload(rawChanged);
    mutate(
      { id: contractId!, data },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Договор успешно изменён');
          const state = location.state;
          setTimeout(() => {
            navigate(`/contracts/${contractId}`, state != null ? { state } : undefined);
          }, 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось изменить договор');
        },
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  };

  const handleFormChange = () => {
    setIsFormChanged(true);
  };

  if (isReferencesLoading || isContractLoading) {
    return <Loader />;
  }
  if (isReferencesError || isContractError || !contract || !referenceBooks) {
    return <NotFound errorMessage='Не найден договор или справочник' />;
  }
  if (contract.is_deleted) {
    return (
      <NotFound errorMessage='Удалённый договор нельзя редактировать. Откройте карточку договора и нажмите «Восстановить».' />
    );
  }

  const resolvedStateId = formReferenceId(watchStateId, contract.state_id);
  const resolvedPartnerId = formReferenceId(watchPartnerId, contract.partner_id);
  const resolvedCipher = (watchCipher ?? contract.cipher) || '';
  const resolvedCategoryId = formReferenceId(watchCategoryId, contract.category_id);
  const resolvedContractTypeId = formReferenceId(watchContractTypeId, contract.contract_type_id);
  const resolvedProjectId = formReferenceId(watchProjectId, contract.project_id);

  const dateSignedStr = (() => {
    const dateSignedValue = watchDateSigned ?? contract.date_signed;
    if (dateSignedValue == null || dateSignedValue === '') return contract.date_signed || '';
    if (dayjs.isDayjs(dateSignedValue)) return dateSignedValue.format('YYYY-MM-DD');
    if (typeof dateSignedValue === 'string') return dateSignedValue;
    return contract.date_signed || '';
  })();

  const title = buildContractDetailsTitle({
    ...contract,
    number: (watchContractNumber ?? contract.number) || '',
    name: (watchContractName ?? contract.name) || '',
    date_signed: dateSignedStr,
  });

  const partnerName = getNameById(resolvedPartnerId, referenceBooks.partners) ?? '';
  const contractCategoryName = getNameById(resolvedCategoryId, referenceBooks.contractCategories) ?? '';
  const showSubtitle = Boolean(partnerName || resolvedCipher || contractCategoryName);
  const subtitle = showSubtitle ? (
    <div className={detailsStyles.detailHeaderSubtitle}>
      {partnerName ? <span className={detailsStyles.detailHeaderPartner}>{partnerName}</span> : null}
      {resolvedCipher ? (
        <span>
          {partnerName ? ' · ' : null}
          Шифр: {resolvedCipher}
        </span>
      ) : null}
      {contractCategoryName ? (
        <span>
          {partnerName || resolvedCipher ? ' · ' : null}
          Категория: {contractCategoryName}
        </span>
      ) : null}
    </div>
  ) : undefined;

  const contractState = getEntityById(resolvedStateId, referenceBooks.contractStates);
  const contractTypeName = getNameById(resolvedContractTypeId, referenceBooks.contractTypes) ?? '';
  const projectEntity = getEntityById(resolvedProjectId, referenceBooks.projects);
  const projectChipLabel = formatProjectChipLabel(projectEntity);

  const previewIsActive =
    resolvedStateId !== contract.state_id
      ? isContractSignedState(resolvedStateId, referenceBooks.contractStates)
      : contract.is_active;
  const statusBadge = buildContractDetailsStatusBadge({
    ...contract,
    is_active: previewIsActive,
  });

  const metaItems = [
    contractState && (
      <span
        key='state'
        className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
      >
        {contractState.name}
      </span>
    ),
    contractTypeName ? (
      <span key='type' className={tagStyles.cardCategory}>
        {contractTypeName}
      </span>
    ) : null,
    projectChipLabel ? (
      <span key='project' className={[tagStyles.cardCategory, detailsStyles.detailHeaderProjectChip].join(' ')}>
        {projectChipLabel}
      </span>
    ) : null,
  ].filter(Boolean);

  const endDateForBanner = (() => {
    const endDateValue = watchEndDate ?? contract.end_date;
    if (endDateValue == null || endDateValue === '') return contract.end_date || '';
    if (dayjs.isDayjs(endDateValue)) return endDateValue.format('YYYY-MM-DD');
    if (typeof endDateValue === 'string') return endDateValue;
    return contract.end_date || '';
  })();
  const daysUntilEnd = getDaysUntilDate(endDateForBanner);
  const showDeadlineBanner = shouldShowDeadlineBanner(daysUntilEnd);
  const formattedEndDate = endDateForBanner
    ? new Date(endDateForBanner).toLocaleDateString('ru-RU')
    : '-';

  const requireFullValidation = !isContractDraft(resolvedStateId, referenceBooks.contractStates);
  const isContractEffectiveByState = isContractSignedState(resolvedStateId, referenceBooks.contractStates);

  const contractFormRefs = referenceBooks as ContractFormRefs;
  const fromNav = (location.state as { from?: string } | null)?.from;

  return (
    <DetailPageHeader
      title={title}
      subtitle={subtitle}
      backLabel={buildContractDetailsBackLabel(fromNav)}
      onBack={handleBack}
      statusBadge={statusBadge}
      metaItems={metaItems}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={handleBack} disabled={isUpdateLoading}>
            Отмена
          </Button>
          <Button
            type='primary'
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={isUpdateLoading}
            disabled={!isFormChanged}
          >
            Сохранить
          </Button>
        </>
      }
      extraContent={
        showDeadlineBanner ? (
          <div className={detailsStyles.deadlineBanner}>
            Срок действия договора истекает через <strong>{daysUntilEnd} дн.</strong> — до{' '}
            <strong>{formattedEndDate}</strong>
          </div>
        ) : undefined
      }
      tabs={[{ key: 'main', label: 'Редактирование' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          size='middle'
          onFieldsChange={handleFormChange}
          onFinish={handleSave}
          disabled={isUpdateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          scrollToFirstError
        >
          <ContractFormMainFields mode='edit' refs={contractFormRefs} requireFullValidation={requireFullValidation} onProjectChange={handleProjectChange} onCreatePartner={handleCreatePartnerFromContract} />
          <div className={styles.threeColSections}>
            <ContractFormMoneyFields
              mode='edit'
              onAmountChange={handleAmountChange}
              onVatRateChange={handleVatRateChange}
              requireFullValidation={requireFullValidation}
            />
            <ContractFormDateFields mode='edit' requireFullValidation={requireFullValidation} />
            <ContractFormClassificationFields
              mode='edit'
              refs={contractFormRefs}
              requireFullValidation={requireFullValidation}
            />
            <ContractFormStateFields
              mode='edit'
              refs={contractFormRefs}
              effectiveByState={isContractEffectiveByState}
              requireFullValidation={requireFullValidation}
            />
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
