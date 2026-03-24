import { useEffect, useRef, useState } from 'react';
import { BankOutlined, CloseOutlined, CloudDownloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { usePartnerById, usePartnerByInn, useUpdatePartner } from '../../api/partners/partnerApiHooks';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { getChangedFields } from '../../helpers/getChangedFields';
import { partnerUpdateFormMapper } from '../../helpers/mappers/partnerUpdateFormMapper';
import { partnerUploadFormMapper } from '../../helpers/mappers/partnerUploadFormMapper';
import { PartnerFormFields } from './PartnerFormFields';
import styles from './PartnerFormPage.module.scss';

export default function PartnerEditPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: partner, isLoading: isPartnerLoading, isError: isPartnerError } = usePartnerById(partnerId!);
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
    isPending: isUpdateLoading,
    isError: isUpdateError,
    isSuccess: isUpdateSuccess,
    error: updateError,
  } = useUpdatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  const isSubmittingRef = useRef(false);
  const wName = Form.useWatch('name', form) as string | undefined;
  const wShortName = Form.useWatch('short_name', form) as string | undefined;
  const wInn = Form.useWatch('inn', form) as string | undefined;
  const wStatusId = Form.useWatch('status_id', form) as string | undefined;
  const wTypeIds = Form.useWatch('type_ids', form) as string[] | undefined;
  useEffect(() => {
    if (partner && referenceBooks?.partnerStatuses) {
      form.setFieldsValue(partnerUpdateFormMapper(partner));
    }
  }, [partner, referenceBooks, form]);
  useEffect(() => {
    if (isUpdateSuccess) {
      showNotification('success', 'Успех', 'Контрагент успешно изменён');
      setTimeout(() => navigate(-1), 1000);
    } else if (isUpdateError) {
      const message = (updateError as any)?.message || 'Не удалось изменить контрагента';
      showNotification('error', 'Ошибка', message);
    }
  }, [isUpdateError, isUpdateSuccess, updateError]);
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
  if (isReferencesLoading || isPartnerLoading) {
    return <Loader />;
  }
  if (isReferencesError || isPartnerError || !referenceBooks) {
    return <NotFound errorMessage='Контрагент не найден' />;
  }
  const headerTitle = (wShortName ?? partner?.short_name) || (wName ?? partner?.name) || 'Контрагент';
  const statusName = referenceBooks?.partnerStatuses?.find(
    status => String(status.id) === String(wStatusId ?? partner?.status_id),
  )?.name;
  const typeNames = (wTypeIds ?? partner?.type_ids ?? [])
    .map(id => referenceBooks?.partnerTypes?.find(partnerType => String(partnerType.id) === String(id))?.name)
    .filter(Boolean);
  const handleSave = async (values: any) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const payload = getChangedFields(values, partnerUpdateFormMapper(partner!));
    payload.type_ids = values.type_ids ?? [];
    payload.competence_ids = values.competence_ids ?? [];
    mutate(
      { id: partnerId!, data: payload },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  };
  return (
    <DetailPageHeader
      title={`Редактирование: ${headerTitle}`}
      backLabel='Контрагенты'
      onBack={() => navigate(-1)}
      statusBadge={
        statusName ? { label: statusName, color: statusName === 'Активный' ? '#52c41a' : '#1677ff' } : undefined
      }
      metaItems={[
        (wInn ?? partner?.inn) && (
          <span key='inn' className={hStyles.metaText}>
            <BankOutlined /> ИНН {wInn ?? partner?.inn}
          </span>
        ),
        typeNames.length > 0 && (
          <span key='types' className={hStyles.metaText}>
            {typeNames.join(', ')}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={() => navigate(-1)} disabled={isUpdateLoading}>
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
          onFieldsChange={() => setIsFormChanged(true)}
          onFinish={handleSave}
          disabled={isUpdateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <PartnerFormFields
            form={form}
            referenceBooks={referenceBooks}
            disabled={isUpdateLoading}
            onUploadByInn={handleUploadByInn}
            isLoadingInn={isLoadingInn}
          />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
