import { useEffect, useRef } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useCreateContract } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
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

type ContractCreateLocationState = { partnerId?: string };

export default function ContractCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const watchStateId = Form.useWatch('state_id', form);
  const partnerIdFromState = (location.state as ContractCreateLocationState | null)?.partnerId;
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const { mutate, isPending: isCreateLoading } = useCreateContract();

  useEffect(() => {
    const draftId = findDraftContractStateId(referenceBooks?.contractStates);
    if (draftId && !form.getFieldValue('state_id')) {
      form.setFieldValue('state_id', draftId);
    }
    if (partnerIdFromState && !form.getFieldValue('partner_id')) {
      form.setFieldValue('partner_id', partnerIdFromState);
    }
  }, [referenceBooks?.contractStates, form, partnerIdFromState]);

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
            navigate(-1);
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
      onBack={() => navigate(-1)}
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
          <ContractFormMainFields mode='create' refs={contractFormRefs} />
          <div className={styles.threeColSections}>
            <ContractFormMoneyFields
              mode='create'
              onAmountChange={handleAmountChange}
              onVatRateChange={handleVatRateChange}
            />
            <ContractFormDateFields mode='create' />
            <ContractFormClassificationFields mode='create' refs={contractFormRefs} />
            <ContractFormStateFields
              mode='create'
              refs={contractFormRefs}
              effectiveByState={createEffectiveByState}
            />
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
