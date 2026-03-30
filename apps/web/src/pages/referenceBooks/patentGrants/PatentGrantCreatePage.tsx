import { useEffect } from 'react';
import { SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { useCreatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { PatentGrantFormFields } from './PatentGrantFormFields';
import styles from './PatentGrantFormPage.module.scss';

export default function PatentGrantCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const patentIdFromState = location.state?.patentId;
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents']);
  const { mutate, isPending: isCreateLoading } = useCreatePatentGrant();
  useEffect(() => {
    if (patentIdFromState && referenceBooks?.patents) {
      form.setFieldsValue({ patent_id: patentIdFromState });
    }
  }, [patentIdFromState, referenceBooks, form]);
  const handleCreate = async (values: any) => {
    const patentId = values.patent_id;
    if (!patentId) return;
    const data = {
      grant_number: values.grant_number,
      grant_date: values.grant_date ? values.grant_date.format('YYYY-MM-DD') : undefined,
      office: values.office || undefined,
      status: values.status,
      renewal_date: values.renewal_date ? values.renewal_date.format('YYYY-MM-DD') : undefined,
      notes: values.notes,
    };
    mutate(
      { patentId, data },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Патентный грант успешно создан');
          if (patentIdFromState) {
            setTimeout(() => navigate(`/patents/${patentIdFromState}/grants`), 1000);
          } else {
            setTimeout(() => navigate(-1), 1000);
          }
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось создать патентный грант');
        },
      },
    );
  };
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <DetailPageHeader
      title='Создание нового патентного гранта'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные для создания гранта</span>}
      backLabel='Патентные гранты'
      onBack={() => navigate(-1)}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать патентный грант
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
          onFinish={handleCreate}
          disabled={isCreateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <PatentGrantFormFields form={form} referenceBooks={referenceBooks} patentIdFromState={patentIdFromState} />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
