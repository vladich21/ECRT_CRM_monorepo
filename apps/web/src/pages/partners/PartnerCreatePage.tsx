import { useRef, useState } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Form } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { useCreatePartner, usePartnerByInn } from '../../api/partners/partnerApiHooks';
import { AsyncBoundary } from '../../components/async/AsyncBoundary';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import { partnerUploadFormMapper, type CompanyApiResponse } from '../../helpers/mappers/partnerUploadFormMapper';
import { initialFormValues } from './data';
import type { PartnerFormRefs, PartnerFormSubmitValues } from './components/form';
import { PartnerFormFields } from './PartnerFormFields';
import { buildPartnerCreatePayload } from './create/utils/buildPartnerCreatePayload';
import { mapPartnerCreateApiErrorToForm } from './create/utils/mapPartnerCreateApiErrorToForm';
import { navigateAfterPartnerCreateSuccess } from './create/utils/navigateAfterPartnerCreateSuccess';
import type { PartnerCreateLocationState } from './create/utils/partnerCreateLocationState.types';
import {
  isPartnerCreateRestricted,
  PARTNER_CREATE_RESTRICTED_MESSAGE,
} from './utils/partnerCreateRestriction';
import styles from './PartnerFormPage.module.scss';

export default function PartnerCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const locationState = (location.state as PartnerCreateLocationState) ?? null;
  const [form] = Form.useForm();
  const [errorFields, setErrorFields] = useState<string[]>([]);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData([
    'partnerCategories',
    'partnerTypes',
    'partnerStatuses',
    'competencies',
    'partnerEconomicCategories',
  ]);
  const { mutate, isPending: isCreateLoading } = useCreatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  const isSubmittingRef = useRef(false);
  const createRestricted = isPartnerCreateRestricted();
  const handleCreate = async (values: PartnerFormSubmitValues) => {
    if (isSubmittingRef.current || !referenceBooks) return;
    isSubmittingRef.current = true;
    setErrorFields([]);
    const payload = buildPartnerCreatePayload(values, referenceBooks);
    mutate(payload, {
      onSuccess: data => {
        showNotification('success', 'Успех', 'Контрагент успешно создан');
        navigateAfterPartnerCreateSuccess(navigate, locationState, data.id);
      },
      onSettled: () => {
        isSubmittingRef.current = false;
      },
      onError: (error: Error) => {
        const message = error?.message || 'Не удалось создать контрагента';
        const formPatch = mapPartnerCreateApiErrorToForm(message);
        if (formPatch) {
          setErrorFields(formPatch.errorFieldNames);
          form.setFields(formPatch.fieldData);
        }
        showNotification('error', 'Ошибка', message);
      },
    });
  };
  const getFieldStatus = (fieldName: string) => {
    return errorFields.includes(fieldName) ? 'error' : undefined;
  };
  const handleUploadByInn = async () => {
    getPartnerDataByInn(form.getFieldValue('inn'), {
      onSuccess: data => {
        const mapped = partnerUploadFormMapper(data as unknown as CompanyApiResponse);
        if (mapped) form.setFieldsValue(mapped);
        showNotification('success', 'Успех', 'Контрагент успешно подгружен');
      },
      onError: () => {
        showNotification('error', 'Ошибка', 'Не удалось подгрузить контрагента');
      },
    });
  };
  return (
    <AsyncBoundary
      isLoading={isReferencesLoading}
      isError={isReferencesError || !referenceBooks}
      errorMessage='Не удалось подгрузить справочники'
    >
      <DetailPageHeader
        title='Создание нового контрагента'
        titleWeight='medium'
        titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные контрагента</span>}
        backLabel={locationState?.fromPurchaseRequest ? 'К запросу на закупку' : 'Контрагенты'}
        onBack={() => {
          if (locationState?.fromPurchaseRequest) {
            navigate(locationState.returnPath ?? '/procurement/requests');
            return;
          }
          if (locationState?.fromContractCreate) {
            navigate(locationState.returnPath ?? '/contracts/create', {
              state: locationState.contractCreateState,
            });
            return;
          }
          navigate(-1);
        }}
        actions={
          createRestricted ? undefined : (
            <>
              <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
                Очистить форму
              </Button>
              <Button
                type='primary'
                icon={<SaveOutlined />}
                loading={isCreateLoading}
                onClick={() => form.submit()}
              >
                Создать контрагента
              </Button>
            </>
          )
        }
        tabs={[{ key: 'main', label: 'Создание' }]}
        activeTab='main'
        onTabChange={() => {}}
        contextHolder={contextHolder}
        stickyHeader
      >
        {createRestricted ? (
          <div className={styles.formCard}>
            <Alert type='info' showIcon message={PARTNER_CREATE_RESTRICTED_MESSAGE} />
          </div>
        ) : (
          <div className={styles.formCard}>
            <Form
              form={form}
              layout='vertical'
              size='middle'
              initialValues={initialFormValues}
              onFinish={handleCreate}
              disabled={isCreateLoading}
              onKeyPress={e => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              scrollToFirstError
            >
              <PartnerFormFields
                form={form}
                referenceBooks={referenceBooks as PartnerFormRefs}
                disabled={isCreateLoading}
                getFieldStatus={getFieldStatus}
                onUploadByInn={handleUploadByInn}
                isLoadingInn={isLoadingInn}
              />
            </Form>
          </div>
        )}
      </DetailPageHeader>
    </AsyncBoundary>
  );
}
