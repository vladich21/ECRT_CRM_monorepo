import { useLayoutEffect, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePatentGrantById, useUpdatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import { PatentGrantFormFields } from './components/PatentGrantFormFields';
import styles from './PatentGrantFormPage.module.scss';
import { buildPatentGrantRidSelectLabel } from './utils/patentGrantCardHelpers';

export default function PatentGrantEditPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: patentGrant, isLoading: isGrantLoading, isError: isGrantError } = usePatentGrantById(grantId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents']);
  const { mutate, isPending: isUpdateLoading } = useUpdatePatentGrant();
  useLayoutEffect(() => {
    if (!patentGrant) return;
    const formData = {
      ...patentGrant,
      grant_date: patentGrant.grant_date ? dayjs(patentGrant.grant_date) : null,
      renewal_date: patentGrant.renewal_date ? dayjs(patentGrant.renewal_date) : null,
    };
    form.setFieldsValue(formData);
  }, [patentGrant, form]);
  const handleSave = async (values: any) => {
    const payload = getChangedFields(values, patentGrant!);
    if (payload.grant_date && dayjs.isDayjs(payload.grant_date)) {
      payload.grant_date = payload.grant_date.format('YYYY-MM-DD');
    }
    if (payload.renewal_date && dayjs.isDayjs(payload.renewal_date)) {
      payload.renewal_date = payload.renewal_date.format('YYYY-MM-DD');
    }
    const patentIdForRedirect = patentGrant?.patent_id;
    mutate(
      { id: grantId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Охранный документ успешно изменён');
          if (patentIdForRedirect) {
            setTimeout(() => navigate(`/patents/${patentIdForRedirect}/grants`), 1000);
          }
        },
        onError: () => {  
          showNotification('error', 'Ошибка', 'Не удалось изменить охранный документ');
        },
      },
    );
  };
  const handleBack = () => {
    navigate(-1);
  };
  const handleFormChange = () => {
    setIsFormChanged(true);
  };
  if (isReferencesLoading || isGrantLoading) {
    return <Loader />;
  }
  if (isReferencesError || isGrantError || !patentGrant || !referenceBooks) {
    return <NotFound errorMessage='Не найден охранный документ или справочник' />;
  }
  return (
    <DetailPageHeader
      title={`Редактирование: ${patentGrant.grant_number}`}
      backLabel='Охранные документы'
      onBack={handleBack}
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
          key={grantId}
          form={form}
          layout='vertical'
          size='middle'
          onFieldsChange={handleFormChange}
          onFinish={handleSave}
          disabled={isUpdateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <PatentGrantFormFields
            referenceBooks={referenceBooks}
            patentIdFromState={null}
            savedOfficeForLegacy={patentGrant.office}
            patentSelectFallback={
              patentGrant.patent_id?.trim()
                ? { id: patentGrant.patent_id.trim(), name: buildPatentGrantRidSelectLabel(patentGrant) }
                : null
            }
          />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
