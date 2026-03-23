import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button } from 'antd';
import { SaveOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import { useReferenceData } from '../../api/hooks/useReferences';
import { useNotification } from '../../customhooks/useNotification';
import DetailPageHeader from '../../components/pageLayout/DetailPageHeader';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import { useCreatePartner, usePartnerByInn } from '../../api/partners/partnerApiHooks';
import { initialFormValues } from './data';
import { partnerUploadFormMapper } from '../../helpers/mappers/partnerUploadFormMapper';
import { PartnerFormFields } from './PartnerFormFields';
import styles from './PartnerFormPage.module.scss';
export default function PartnerCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
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
  const {
    mutate,
    isPending: isCreateLoading,
    isError: isCreateError,
    isSuccess: isCreateSuccess,
    error: createError,
  } = useCreatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  useEffect(() => {
    if (isCreateSuccess) {
      showNotification('success', 'Успех', 'Контрагент успешно создан');
      setTimeout(() => navigate(-1), 1000);
    }
  }, [isCreateSuccess, createError, navigate, showNotification]);
  const isSubmittingRef = useRef(false);
  const handleCreate = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setErrorFields([]);
    const payload = {
      ...values,
      status_id: values.status_id || null,
      type_ids: values.type_ids || [],
      competence_ids: values.competence_ids || [],
      partner_economic_category_id: values.partner_economic_category_id,
    };
    mutate(payload, {
      onSettled: () => {
        isSubmittingRef.current = false;
      },
      onError: (error: any) => {
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
        form.setFieldsValue(partnerUploadFormMapper(data as any));
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
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные контрагента</span>}
      backLabel='Контрагенты'
      onBack={() => navigate(-1)}
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
            referenceBooks={referenceBooks}
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
