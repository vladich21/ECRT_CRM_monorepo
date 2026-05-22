import { useEffect, useMemo, useRef, useState } from 'react';
import { InfoCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Modal, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePatentById } from '../../../api/patents/patentApiHooks';
import { useCreatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import type { PatentGrant } from '../../../types/patent';
import { PatentGrantFormFields } from './components/PatentGrantFormFields';
import { buildPatentSelectLabel } from './utils/patentGrantCardHelpers';
import styles from './PatentGrantFormPage.module.scss';

type PatentGrantCreateFormValues = {
  patent_id?: string;
  grant_number?: string;
  grant_date?: { format: (fmt: string) => string };
  office?: string;
  status?: string;
  renewal_date?: { format: (fmt: string) => string };
  notes?: string;
  expected_licensee_partner_ids?: string[];
};

export default function PatentGrantCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const patentIdFromState =
    typeof location.state?.patentId === 'string' ? location.state.patentId.trim() : '';
  const fromRegistry = location.state?.fromRegistry === true;
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents', 'partners']);
  const { data: linkedPatentFromState } = usePatentById(patentIdFromState);
  const patentSelectFallback = useMemo(() => {
    if (!linkedPatentFromState?.id) return null;
    return {
      id: linkedPatentFromState.id,
      name: buildPatentSelectLabel(linkedPatentFromState),
    };
  }, [linkedPatentFromState]);
  const { mutate, isPending: isCreateLoading } = useCreatePatentGrant();
  const [ipsReminderOpen, setIpsReminderOpen] = useState(false);
  const pendingValuesRef = useRef<PatentGrantCreateFormValues | null>(null);
  useEffect(() => {
    if (!patentIdFromState || !referenceBooks?.patents) return;

    const inReferenceList = referenceBooks.patents.some(p => p.id === patentIdFromState);
    const fallbackReady = linkedPatentFromState?.id === patentIdFromState;
    if (inReferenceList || fallbackReady) {
      form.setFieldsValue({ patent_id: patentIdFromState });
    }
  }, [patentIdFromState, referenceBooks, linkedPatentFromState, form]);
  const submitGrantCreation = (values: PatentGrantCreateFormValues) => {
    const patentId = values.patent_id;
    const grantNumber = values.grant_number?.trim();
    if (!patentId || !grantNumber) return;

    const data: Omit<PatentGrant, 'id' | 'patent_id' | 'created_at' | 'updated_at'> = {
      grant_number: grantNumber,
      status: values.status ?? 'Активный',
      renewal_date: values.renewal_date ? values.renewal_date.format('YYYY-MM-DD') : '',
      expected_licensee_partner_ids: values.expected_licensee_partner_ids ?? [],
      ...(values.grant_date ? { grant_date: values.grant_date.format('YYYY-MM-DD') } : {}),
      ...(values.office?.trim() ? { office: values.office.trim() } : {}),
      ...(values.notes !== undefined && values.notes !== '' ? { notes: values.notes } : {}),
    };
    mutate(
      { patentId, data },
      {
        onSuccess: () => {
          pendingValuesRef.current = null;
          showNotification('success', 'Успех', 'Охранный документ успешно создан');
          if (fromRegistry) {
            setTimeout(() => navigate('/patent-grants'), 1000);
          } else if (patentIdFromState) {
            setTimeout(() => navigate(`/patents/${patentId}/grants`), 1000);
          } else {
            setTimeout(() => navigate(-1), 1000);
          }
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось создать охранный документ');
        },
      },
    );
  };

  const handleFormValidFinish = (values: PatentGrantCreateFormValues) => {
    pendingValuesRef.current = values;
    setIpsReminderOpen(true);
  };

  const handleConfirmAfterReminder = () => {
    const values = pendingValuesRef.current;
    setIpsReminderOpen(false);
    if (!values) return;
    submitGrantCreation(values);
  };

  const handleCancelReminder = () => {
    setIpsReminderOpen(false);
    pendingValuesRef.current = null;
  };
  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }
  return (
    <DetailPageHeader
      title='Создание нового охранного документа'
      titleSuffix={<span style={{ fontSize: 14, opacity: 0.85 }}>Заполните данные для создания</span>}
      backLabel={fromRegistry ? 'Реестр охранных документов' : 'Назад'}
      onBack={() => (fromRegistry ? navigate('/patent-grants') : navigate(-1))}
      actions={
        <>
          <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
            Очистить форму
          </Button>
          <Button type='primary' icon={<SaveOutlined />} loading={isCreateLoading} onClick={() => form.submit()}>
            Создать
          </Button>
        </>
      }
      tabs={[{ key: 'main', label: 'Создание' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
      stickyHeader
    >
      <Modal
        title={
          <span>
            <InfoCircleOutlined style={{ marginRight: 8, color: 'var(--ant-color-primary)' }} />
            Напоминание
          </span>
        }
        open={ipsReminderOpen}
        centered
        width={480}
        onCancel={handleCancelReminder}
        destroyOnHidden
        footer={[
          <Button key='cancel' onClick={handleCancelReminder}>
            Отмена
          </Button>,
          <Button key='submit' type='primary' loading={isCreateLoading} onClick={handleConfirmAfterReminder}>
            Создать
          </Button>,
        ]}
        maskClosable={!isCreateLoading}
        closable={!isCreateLoading}
      >
        <Alert
          type='info'
          showIcon
          message='Загрузка в IPS'
          description={
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              После получения патента не забудьте выполнить загрузку сведений в IPS — это обязательный шаг для учета
              охранного документа.
            </Typography.Paragraph>
          }
          style={{ marginBottom: 0 }}
        />
      </Modal>
      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          size='middle'
          initialValues={{ status: 'Активный' }}
          onFinish={handleFormValidFinish}
          disabled={isCreateLoading}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <PatentGrantFormFields referenceBooks={referenceBooks} patentSelectFallback={patentSelectFallback} />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
