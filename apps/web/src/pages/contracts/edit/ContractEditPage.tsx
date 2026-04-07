import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useContractById, useUpdateContract } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { contractUpdateFormMapper } from '../../../helpers/mappers/contractUpdateFormMapper';
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
import { normalizeDraftDateFields } from '../../../utils/normalizeDraftDateFields';
import tagStyles from '../list/ContractsListPage.module.scss';
import { applyDayjsDateFieldsToPayload } from './contractEditFormUtils';
import { useContractEditFormWatchers } from './hooks/useContractEditFormWatchers';
import { buildContractEditHeaderMeta } from './utils/contractEditHeaderUtils';

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
    date_signed: watchDateSigned,
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

  const handleBack = () => navigate(`/contracts/${contractId}`);

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

  const {
    title,
    headerName,
    contractState,
    stateTagClass,
    contractTypeName,
    contractCategoryName,
    partnerName,
    isEffective: isContractEffectiveByState,
    requireFullValidation,
    signedDateLabel,
  } = buildContractEditHeaderMeta(
    {
      number: watchContractNumber,
      cipher: watchCipher,
      name: watchContractName,
      category_id: watchCategoryId,
      contract_type_id: watchContractTypeId,
      state_id: watchStateId,
      partner_id: watchPartnerId,
      date_signed: watchDateSigned,
    },
    contract,
    referenceBooks,
  );

  const contractFormRefs = referenceBooks as ContractFormRefs;

  return (
    <DetailPageHeader
      title={title}
      titleSuffix={
        <>
          {contractTypeName ? <span className={hStyles.metaText}>{contractTypeName}</span> : null}
          {signedDateLabel ? <span className={hStyles.metaText}>Подписан: {signedDateLabel}</span> : null}
        </>
      }
      backLabel='Договоры'
      onBack={handleBack}
      statusBadge={{
        label: isContractEffectiveByState ? 'Действует' : 'Не действует',
        variant: isContractEffectiveByState ? 'success' : 'danger',
      }}
      metaItems={[
        headerName ? (
          <span key='name' className={hStyles.metaText}>
            {headerName}
          </span>
        ) : null,
        contractState && stateTagClass ? (
          <span key='state' className={tagStyles[stateTagClass as keyof typeof tagStyles]}>
            {contractState.name}
          </span>
        ) : null,
        contractCategoryName ? (
          <span key='category' className={tagStyles.cardCategory}>
            {contractCategoryName}
          </span>
        ) : null,
        partnerName ? (
          <span key='partner' className={hStyles.metaText}>
            {partnerName}
          </span>
        ) : null,
      ].filter(Boolean)}
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
      tabs={[{ key: 'main', label: 'Редактирование' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
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
