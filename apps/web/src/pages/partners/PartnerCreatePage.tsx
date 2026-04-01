import { useRef, useState } from 'react';
import { CloudDownloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { useCreatePartner, usePartnerByInn } from '../../api/partners/partnerApiHooks';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { partnerUploadFormMapper, type CompanyApiResponse } from '../../helpers/mappers/partnerUploadFormMapper';
import { initialFormValues } from './data';
import type { PartnerFormRefs, PartnerFormSubmitValues } from './components/form';
import { PartnerFormFields } from './PartnerFormFields';
import type { Partner } from '../../types/partner';
import { computePartnerIsApproved, inferPartnerCategoryKind } from '../../utils/partnerApproval';
import styles from './PartnerFormPage.module.scss';

export default function PartnerCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const locationState = (location.state as
    | {
        fromContractCreate?: boolean;
        returnPath?: string;
        contractCreateState?: { partnerId?: string };
      }
    | null) ?? null;
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
  const handleCreate = async (values: PartnerFormSubmitValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorFields([]);
    const categoryName =
      referenceBooks?.partnerCategories?.find(category => String(category.id) === String(values.category_id))?.name ?? null;
    const payload = {
      ...values,
      manual_archive: Boolean(values.manual_archive),
      type_ids: values.type_ids || [],
      competence_ids: values.competence_ids || [],
      partner_economic_category_id: values.partner_economic_category_id,
      is_approved: computePartnerIsApproved({
        kind: inferPartnerCategoryKind(categoryName),
        legalCheckPassed: Boolean(values.legal_check_passed),
        questionnaireFilled: Boolean(values.questionnaire_filled),
        initialAssessmentDone: Boolean(values.initial_assessment_done),
        hasActiveSupplierEvaluationBlock: false,
      }),
    } as Partner;
    mutate(payload, {
      onSuccess: data => {
        showNotification('success', 'Успех', 'Контрагент успешно создан');
        setTimeout(() => {
          if (locationState?.fromContractCreate) {
            navigate(locationState.returnPath ?? '/contracts/create', {
              state: {
                ...(locationState.contractCreateState ?? {}),
                restoreContractDraft: true,
                createdPartnerId: data.id,
              },
            });
            return;
          }
          navigate(-1);
        }, 1000);
      },
      onSettled: () => {
        isSubmittingRef.current = false;
      },
      onError: (error: Error) => {
        const message = error?.message || 'Не удалось создать контрагента';
        const isInnKppDuplicate = message.includes('ИНН и КПП');
        const isInnRequired = message.includes('ИНН обязателен');
        const isKppRequired = message.includes('КПП обязателен');
        if (isInnKppDuplicate) {
          setErrorFields(['inn', 'kpp']);
          form.setFields([
            { name: 'inn', errors: ['Контрагент с такой комбинацией ИНН и КПП уже существует'] },
            { name: 'kpp', errors: ['Контрагент с такой комбинацией ИНН и КПП уже существует'] },
          ]);
        } else if (isInnRequired) {
          setErrorFields(['inn']);
          form.setFields([{ name: 'inn', errors: ['ИНН обязателен для заполнения'] }]);
        } else if (isKppRequired) {
          setErrorFields(['kpp']);
          form.setFields([{ name: 'kpp', errors: ['КПП обязателен для заполнения'] }]);
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
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <DetailPageHeader
      title='Создание нового контрагента'
      titleWeight='medium'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные контрагента</span>}
      backLabel='Контрагенты'
      onBack={() => {
        if (locationState?.fromContractCreate) {
          navigate(locationState.returnPath ?? '/contracts/create', {
            state: locationState.contractCreateState,
          });
          return;
        }
        navigate(-1);
      }}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать контрагента
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
    </DetailPageHeader>
  );
}
