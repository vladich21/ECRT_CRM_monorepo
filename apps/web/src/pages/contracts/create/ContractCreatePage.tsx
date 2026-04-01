import { useEffect, useRef } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCreateContract } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { CONTRACTS_REGISTRY_PATH } from '../constants/routes';
import {
  ContractFormClassificationFields,
  ContractFormDateFields,
  ContractFormMainFields,
  ContractFormMoneyFields,
  ContractFormStateFields,
  type ContractFormRefs,
} from '../components/form';
import { initialFormValues } from '../list/data';
import { isContractSignedState } from '../utils/contractStateUtils';
import {
  applyVatDerivedAmounts,
  buildCreateContractPayload,
  findDraftContractStateId,
} from './contractCreateFormUtils';
import styles from './ContractCreatePage.module.scss';

const CONTRACT_CREATE_DRAFT_STORAGE_KEY = 'contract-create-draft';
const CONTRACT_DATE_FIELDS = ['start_date', 'end_date', 'date_signed'] as const;
type ContractCreateLocationState = {
  partnerId?: string;
  createdPartnerId?: string;
  restoreContractDraft?: boolean;
};

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const watchStateId = Form.useWatch('state_id', form);
  const locationState = (location.state as ContractCreateLocationState | null) ?? null;
  const partnerIdFromState = locationState?.partnerId;
  const restoredPartnerId = locationState?.createdPartnerId;
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
    refetch: refetchReferences,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const { mutate, isPending: isCreateLoading } = useCreateContract();

  const normalizeDraftValues = (draft: Record<string, unknown>) => {
    const normalized = { ...draft };
    for (const key of CONTRACT_DATE_FIELDS) {
      const raw = normalized[key];
      if (!raw) {
        normalized[key] = null;
        continue;
      }
      if (dayjs.isDayjs(raw)) continue;
      if (typeof raw === 'string' || raw instanceof Date || typeof raw === 'number') {
        const parsed = dayjs(raw);
        normalized[key] = parsed.isValid() ? parsed : null;
      } else {
        normalized[key] = null;
      }
    }
    return normalized;
  };

  useEffect(() => {
    const draftId = findDraftContractStateId(referenceBooks?.contractStates);
    if (draftId && !form.getFieldValue('state_id')) {
      form.setFieldValue('state_id', draftId);
    }
    if (partnerIdFromState && !form.getFieldValue('partner_id')) {
      form.setFieldValue('partner_id', partnerIdFromState);
    }
  }, [referenceBooks?.contractStates, form, partnerIdFromState]);

  useEffect(() => {
    if (!locationState?.restoreContractDraft) return;
    const draftRaw = sessionStorage.getItem(CONTRACT_CREATE_DRAFT_STORAGE_KEY);
    if (draftRaw) {
      try {
        const draft = JSON.parse(draftRaw) as Record<string, unknown>;
        form.setFieldsValue(normalizeDraftValues(draft));
      } catch {
        // noop: invalid draft payload should not block form usage
      }
      sessionStorage.removeItem(CONTRACT_CREATE_DRAFT_STORAGE_KEY);
    }
    void refetchReferences().then(() => {
      if (restoredPartnerId) {
        form.setFieldValue('partner_id', restoredPartnerId);
      }
    });
    navigate(location.pathname, {
      replace: true,
      state: partnerIdFromState ? { partnerId: partnerIdFromState } : undefined,
    });
  }, [form, location.pathname, locationState?.restoreContractDraft, navigate, partnerIdFromState, refetchReferences, restoredPartnerId]);

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
  const handleCreatePartnerFromContract = () => {
    const draftValues = form.getFieldsValue(true);
    sessionStorage.setItem(CONTRACT_CREATE_DRAFT_STORAGE_KEY, JSON.stringify(draftValues));
    navigate('/partners/create', {
      state: {
        fromContractCreate: true,
        returnPath: location.pathname,
        contractCreateState: locationState,
      },
    });
  };

  const handleCreate = (values: Record<string, unknown>) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    mutate(buildCreateContractPayload(values), {
      onSuccess: () => {
        showNotification('success', 'Успех', 'Договор успешно создан');
        window.setTimeout(() => {
          if (partnerIdFromState) {
            navigate(`/partners/${partnerIdFromState}/contracts`);
          } else {
            navigate(CONTRACTS_REGISTRY_PATH);
          }
        }, 1000);
      },
      onError: () => {
        showNotification('error', 'Ошибка', 'Не удалось создать договор');
      },
      onSettled: () => {
        isSubmittingRef.current = false;
      },
    });
  };

  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const createEffectiveByState = isContractSignedState(
    typeof watchStateId === 'string' ? watchStateId : undefined,
    referenceBooks.contractStates,
  );

  const contractFormRefs = referenceBooks as ContractFormRefs;

  return (
    <DetailPageHeader
      title='Создание нового договора'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные для создания договора</span>}
      backLabel='Договоры'
      onBack={() => navigate(CONTRACTS_REGISTRY_PATH)}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать договор
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Создание' }]}
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
          initialValues={initialFormValues}
          onFinish={handleCreate}
          disabled={isCreateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
            }
          }}
          scrollToFirstError
        >
          <ContractFormMainFields mode='create' refs={contractFormRefs} onCreatePartner={handleCreatePartnerFromContract} />
          <div className={styles.threeColSections}>
            <ContractFormMoneyFields
              mode='create'
              onAmountChange={handleAmountChange}
              onVatRateChange={handleVatRateChange}
              requireFullValidation={false}
            />
            <ContractFormDateFields mode='create' requireFullValidation={false} />
            <ContractFormClassificationFields mode='create' refs={contractFormRefs} requireFullValidation={false} />
            <ContractFormStateFields
              mode='create'
              refs={contractFormRefs}
              effectiveByState={createEffectiveByState}
              requireFullValidation={false}
            />
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
