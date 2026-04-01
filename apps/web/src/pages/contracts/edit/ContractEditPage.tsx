import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useContractById, useUpdateContract } from '../../../api/contracts/contractApiHooks';
import { useReferenceData } from '../../../api/hooks/useReferences';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { getEntityById } from '../../../helpers/getEntityById';
import { formReferenceId } from '../../../helpers/formReferenceId';
import { getNameById } from '../../../helpers/getNameById';
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
import { formatDate } from '../details/tabs/stages/data';
import tagStyles from '../list/ContractsListPage.module.scss';
import { getContractStateTagClass, isContractDraft, isContractSignedState } from '../utils/contractStateUtils';
import { applyDayjsDateFieldsToPayload } from './contractEditFormUtils';

export default function ContractEditPage() {
  const { contractId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateBackToDetails = () => {
    const state = location.state;
    navigate(`/contracts/${contractId}`, state != null ? { state } : undefined);
  };
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: contract, isLoading: isContractLoading, isError: isContractError } = useContractById(contractId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['projects', 'partners', 'users', 'contractStates', 'contractCategories', 'contractTypes']);
  const { mutate, isPending: isUpdateLoading } = useUpdateContract();
  const watchContractNumber = Form.useWatch('number', form);
  const watchCipher = Form.useWatch('cipher', form);
  const watchContractName = Form.useWatch('name', form);
  const watchCategoryId = Form.useWatch('category_id', form);
  const watchContractTypeId = Form.useWatch('contract_type_id', form);
  const watchStateId = Form.useWatch('state_id', form);
  const watchPartnerId = Form.useWatch('partner_id', form);
  const watchDateSigned = Form.useWatch('date_signed', form);
  const handleBack = navigateBackToDetails;

  useEffect(() => {
    if (contract) {
      form.setFieldsValue(contractUpdateFormMapper(contract));
    }
  }, [contract, form]);

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

  const headerNumber = (watchContractNumber ?? contract.number) || '';
  const headerCipher = (watchCipher ?? contract.cipher) || '';
  const title = `Договор №${headerNumber || '—'}${headerCipher ? ` (${headerCipher})` : ''}`;
  const stateId = formReferenceId(watchStateId, contract.state_id);
  const categoryId = formReferenceId(watchCategoryId, contract.category_id);
  const contractTypeId = formReferenceId(watchContractTypeId, contract.contract_type_id);
  const partnerId = formReferenceId(watchPartnerId, contract.partner_id);
  const contractState = getEntityById(stateId, referenceBooks?.contractStates);
  const contractCategoryName = getNameById(categoryId, referenceBooks?.contractCategories ?? []) ?? '';
  const contractTypeName = getNameById(contractTypeId, referenceBooks?.contractTypes ?? []) ?? '';
  const partnerName = getNameById(partnerId, referenceBooks?.partners ?? []) ?? '';
  const headerName = (watchContractName ?? contract.name) || '';
  const isContractEffectiveByState = isContractSignedState(stateId, referenceBooks?.contractStates);
  const requireFullValidation = !isContractDraft(stateId, referenceBooks?.contractStates);
  const signedDateLabel = (() => {
    const dateSignedValue = watchDateSigned ?? contract.date_signed;
    if (!dateSignedValue) return '';
    if (dayjs.isDayjs(dateSignedValue)) return dateSignedValue.format('DD.MM.YYYY');
    if (typeof dateSignedValue === 'string') return formatDate(dateSignedValue);
    return '';
  })();

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
        contractState ? (
          <span
            key='state'
            className={tagStyles[getContractStateTagClass(contractState.code) as keyof typeof tagStyles]}
          >
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
          <ContractFormMainFields mode='edit' refs={contractFormRefs} requireFullValidation={requireFullValidation} />
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
