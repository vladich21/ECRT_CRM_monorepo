import { useEffect } from 'react';
import axios from 'axios';
import { SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import { useCreatePatent } from '@/api/patents/patentApiHooks';
import { useCreatePatentArea } from '@/api/patents/patentAreasApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useMutateByModal } from '@/customhooks/useMutateByModal';
import { useNotification } from '@/customhooks/useNotification';
import { getEntityById } from '@/helpers/getEntityById';
import { defaultLicenseeFormRows } from '@/helpers/licenseeEntryHelpers';
import type { Patent, PatentArea } from '@/types/patent';
import {
  PatentFormIdentityFields,
  PatentFormOrgFields,
  PatentFormRegistrationFields,
  type PatentFormRefs,
} from './components/form';
import { buildPatentFormPayload } from './patentFormPayload';
import {
  applyPatentRidVatAmounts,
  PATENT_DEFAULT_RID_VAT_RATE,
} from './utils/patentRidCostUtils';
import styles from './PatentFormPage.module.scss';

export default function PatentCreatePage() {
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const {
    data: referenceBooks,
    isLoading: isReferencesLoading,
    isError: isReferencesError,
  } = useReferenceData(
    [
      'departments',
      'users',
      'contracts',
      'projects',
      'partners',
      'patentIntellectProps',
      'patentStatuses',
      'patentAreas',
    ],
    { contractsIncludeInactive: true },
  );
  const { mutate, isPending: isCreateLoading } = useCreatePatent();
  const addAreaMutation = useCreatePatentArea();
  const { handleOpenModal: openMutateModal, data: addAreaResult } = useMutateByModal<PatentArea, Error>({
    isEdit: false,
    mutation: addAreaMutation,
    successMessage: 'Область патентных заявок успешно добавлена',
    errorMessage: 'Не удалось добавить область патентных заявок',
    modalType: 'patentAreaForm',
    getMutationProps: () => undefined,
    showNotification,
  });

  useEffect(() => {
    if (addAreaResult?.id) {
      try {
        const currentValues: (string | number)[] = form.getFieldValue('area_ids') || [];
        const newId = String(addAreaResult.id);
        if (!newId || newId === 'NaN') return;
        const currentStr = currentValues.map(value => String(value)).filter(value => value && value !== 'NaN');
        if (!currentStr.includes(newId)) {
          form.setFieldValue('area_ids', [...currentStr, newId]);
        }
      } catch {
        /* ignore */
      }
    }
  }, [addAreaResult, form]);

  const handleRidCostChange = (value: number | null) => {
    const vatRate = form.getFieldValue('rid_vat_rate');
    if (value != null && vatRate != null) {
      applyPatentRidVatAmounts(form, value, Number(vatRate));
    }
  };

  const handleRidVatRateChange = (value: number | null) => {
    const amountExcl = form.getFieldValue('rid_cost_excl_vat');
    if (value != null && amountExcl != null) {
      applyPatentRidVatAmounts(form, Number(amountExcl), value);
    }
  };

  const handleCreate = (values: Record<string, unknown>) => {
    const payload = buildPatentFormPayload(values) as Omit<
      Patent,
      'id' | 'created_at' | 'updated_at' | 'is_deleted'
    >;
    mutate(payload, {
      onSuccess: () => {
        showNotification('success', 'Успех', 'Патент успешно создан');
        setTimeout(() => navigate(-1), 1000);
      },
      onError: (e: unknown) => {
        const msg = axios.isAxiosError(e)
          ? (e.response?.data as { message?: string } | undefined)?.message
          : undefined;
        const fallback = e instanceof Error ? e.message : '';
        showNotification('error', 'Ошибка', msg || fallback || 'Не удалось создать патент');
      },
    });
  };

  const handleProjectChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('project_id', value);
      form.setFieldValue('project_code', getEntityById(value, referenceBooks?.projects)?.code);
    } else {
      form.setFieldValue('project_code', '');
    }
  };

  if (isReferencesLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const refs = referenceBooks as PatentFormRefs;

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton />
      <PageHeader
        title='Создание нового РИД'
        titleWeight='medium'
        subtitle='Заполните данные для создания объекта интеллектуальной собственности'
      />

      <div className={styles.formCard}>
        <Form
          form={form}
          layout='vertical'
          initialValues={{
            expected_licensees: defaultLicenseeFormRows([]),
            rid_vat_rate: PATENT_DEFAULT_RID_VAT_RATE,
          }}
          onFinish={handleCreate}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <div className={styles.formSectionsStack}>
            <PatentFormIdentityFields refs={refs} areasField='quickAdd' onOpenAreaModal={openMutateModal} />
            <div className={styles.twoColSections}>
              <PatentFormRegistrationFields
                onRidCostChange={handleRidCostChange}
                onRidVatRateChange={handleRidVatRateChange}
              />
              <PatentFormOrgFields
                refs={refs}
                incomeContracts={referenceBooks.contracts ?? []}
                onProjectChange={handleProjectChange}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button onClick={() => form.resetFields()} disabled={isCreateLoading}>
              Очистить форму
            </Button>
            <Button type='primary' htmlType='submit' icon={<SaveOutlined />} loading={isCreateLoading}>
              Создать РИД
            </Button>
          </div>
        </Form>
      </div>
    </div>
  );
}
