import { useLayoutEffect, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import dayjs from 'dayjs';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePatentGrantById, useUpdatePatentGrant } from '../../../api/patents/patentGrantsApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import { getChangedFields } from '../../../helpers/getChangedFields';
import {
  defaultLicenseeFormRows,
  getPatentGrantActualLicensees,
  normalizeLicenseeEntriesForPayload,
} from '../../../helpers/licenseeEntryHelpers';
import { PatentGrantFormFields } from './components/PatentGrantFormFields';
import styles from './PatentGrantFormPage.module.scss';
import { buildPatentGrantRidSelectLabel } from './utils/patentGrantCardHelpers';

export default function PatentGrantEditPage() {
  const { grantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: patentGrant, isLoading: isGrantLoading, isError: isGrantError } = usePatentGrantById(grantId!);
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(['patents', 'partners', 'projects', 'contracts']);
  const { mutate, isPending: isUpdateLoading } = useUpdatePatentGrant();
  const grantDetailNavState = location.state;
  useLayoutEffect(() => {
    if (!patentGrant) return;
    const formData = {
      ...patentGrant,
      grant_date: patentGrant.grant_date ? dayjs(patentGrant.grant_date) : null,
      renewal_date: patentGrant.renewal_date ? dayjs(patentGrant.renewal_date) : null,
      actual_licensees: defaultLicenseeFormRows(getPatentGrantActualLicensees(patentGrant)),
    };
    form.setFieldsValue(formData);
    setIsFormChanged(false);
  }, [patentGrant, form]);
  const handleSave = async (values: any) => {
    const normalizedValues = {
      ...values,
      actual_licensees: normalizeLicenseeEntriesForPayload(values.actual_licensees),
    };
    const normalizedInitial = {
      ...patentGrant!,
      actual_licensees: getPatentGrantActualLicensees(patentGrant),
    };
    const payload = getChangedFields(normalizedValues, normalizedInitial);
    if (payload.grant_date && dayjs.isDayjs(payload.grant_date)) {
      payload.grant_date = payload.grant_date.format('YYYY-MM-DD');
    }
    if (payload.renewal_date && dayjs.isDayjs(payload.renewal_date)) {
      payload.renewal_date = payload.renewal_date.format('YYYY-MM-DD');
    }
    mutate(
      { id: grantId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Охранный документ успешно изменен');
          setTimeout(
            () =>
              navigate(`/patent-grants/${grantId}`, grantDetailNavState ? { state: grantDetailNavState } : {}),
            1000,
          );
        },
        onError: () => {  
          showNotification('error', 'Ошибка', 'Не удалось изменить охранный документ');
        },
      },
    );
  };
  const handleBack = () => {
    navigate(`/patent-grants/${grantId}`, grantDetailNavState ? { state: grantDetailNavState } : {});
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
      backLabel='Охранный документ'
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
            mode='edit'
            referenceBooks={referenceBooks}
            savedOfficeForLegacy={patentGrant.office}
            initialPatentId={patentGrant.patent_id}
            initialRidRegNumber={patentGrant.patent_registration_number}
            patentSelectFallback={
              patentGrant.patent_id?.trim()
                ? {
                    id: patentGrant.patent_id.trim(),
                    name: buildPatentGrantRidSelectLabel(patentGrant),
                  }
                : null
            }
          />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
