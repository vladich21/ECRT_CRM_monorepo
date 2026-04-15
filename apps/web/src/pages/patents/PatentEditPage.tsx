import { useEffect, useMemo, useState } from 'react';
import { CloseOutlined, SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractById } from '@/api/contracts/contractApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { usePatentById, useUpdatePatent } from '@/api/patents/patentApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, {
  detailHeaderVariantForPatentRidStatus,
  detailPageHeaderStyles as hStyles,
} from '@/components/pageLayout/DetailPageHeader';
import { useNotification } from '@/customhooks/useNotification';
import { formReferenceId } from '@/helpers/formReferenceId';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { patentUpdateFormMapper } from '@/helpers/mappers/patentUpdateFormMapper';
import {
  PatentFormIdentityFields,
  PatentFormOrgFields,
  PatentFormRegistrationFields,
  type PatentFormRefs,
} from './components/form';
import { buildPatentFormPayload } from './patentFormPayload';
import type { Patent } from '@/types/patent';
import styles from './PatentFormPage.module.scss';

export default function PatentEditPage() {
  const { patentId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const { data: patent, isLoading: isPatentLoading, isError: isPatentError } = usePatentById(patentId!);
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
      'patentIntellectProps',
      'patentStatuses',
      'patentAreas',
    ],
    { contractsIncludeInactive: true },
  );
  const { mutate, isPending: isUpdateLoading } = useUpdatePatent();

  useEffect(() => {
    if (patent) form.setFieldsValue(patentUpdateFormMapper(patent, referenceBooks));
  }, [patent, form, referenceBooks]);

  const handleUpdate = (values: Record<string, unknown>) => {
    mutate(
      { id: patentId!, data: buildPatentFormPayload(values) as Partial<Patent> },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Патент успешно изменён');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: () => {
          showNotification('error', 'Ошибка', 'Не удалось изменить патент');
        },
      },
    );
  };

  const handleProjectChange = (value: string | null) => {
    if (value) {
      form.setFieldValue('project_id', value);
      form.setFieldValue('project_code', getEntityById(value, referenceBooks?.projects)?.code);
    } else {
      form.setFieldValue('project_code', '');
    }
  };

  const watchName = Form.useWatch('name', form);
  const watchIntellectPropId = Form.useWatch('intellectprop_id', form);
  const watchStatusId = Form.useWatch('status_id', form);
  const watchDepartmentId = Form.useWatch('department_id', form);
  const watchRegNumber = Form.useWatch('registration_number', form);

  const incomeContractMissingFromPicker =
    Boolean(patent?.contract_id) &&
    !(referenceBooks?.contracts ?? []).some(row => row.id === patent?.contract_id);
  const incomeContractFetchId = incomeContractMissingFromPicker && patent?.contract_id ? patent.contract_id : '';
  const { data: incomeContractFetched } = useContractById(incomeContractFetchId);
  const incomeContractOptions = useMemo(() => {
    const options = [...(referenceBooks?.contracts ?? [])];
    if (incomeContractFetched && !options.some(row => row.id === incomeContractFetched.id)) {
      options.unshift(incomeContractFetched);
    }
    return options;
  }, [referenceBooks?.contracts, incomeContractFetched]);

  if (isReferencesLoading || isPatentLoading) {
    return <Loader />;
  }
  if (isReferencesError || !referenceBooks || isPatentError || !patent) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const refs = referenceBooks as PatentFormRefs;
  const headerName = (watchName ?? patent.name) || '';
  const headerRegNumber = (watchRegNumber ?? patent.registration_number) || '';
  const intellectpropId = formReferenceId(watchIntellectPropId, patent.intellectprop_id);
  const patentStatusId = formReferenceId(watchStatusId, patent.status_id);
  const departmentId = formReferenceId(watchDepartmentId, patent.department_id);
  const ipTypeName = getNameById(intellectpropId, referenceBooks.patentIntellectProps) || '';
  const statusName = getNameById(patentStatusId, referenceBooks.patentStatuses) || '';
  const deptName = getNameById(departmentId, referenceBooks.departments) || '';
  const headerStatusBadge = patent.is_deleted
    ? { label: 'Удалён' as const, variant: 'danger' as const }
    : {
        label: statusName || 'Статус не выбран',
        variant: detailHeaderVariantForPatentRidStatus(statusName),
      };

  return (
    <DetailPageHeader
      title={`Редактирование: РИД ${headerRegNumber || '—'}`}
      titleWeight='medium'
      backLabel='Реестр РИД'
      onBack={() => navigate(-1)}
      statusBadge={headerStatusBadge}
      metaItems={[
        headerName ? (
          <span key='name' className={hStyles.metaText}>
            {headerName}
          </span>
        ) : null,
        ipTypeName ? (
          <span key='ipType' className={hStyles.metaType}>
            {ipTypeName}
          </span>
        ) : null,
        deptName ? (
          <span key='dept' className={hStyles.metaText}>
            <TeamOutlined /> {deptName}
          </span>
        ) : null,
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
          onFinish={handleUpdate}
          onKeyPress={e => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          scrollToFirstError
        >
          <div className={styles.formSectionsStack}>
            <PatentFormIdentityFields refs={refs} areasField='multi' />
            <div className={styles.twoColSections}>
              <PatentFormRegistrationFields />
              <PatentFormOrgFields
                refs={refs}
                incomeContracts={incomeContractOptions}
                onProjectChange={handleProjectChange}
              />
            </div>
          </div>
        </Form>
      </div>
    </DetailPageHeader>
  );
}
