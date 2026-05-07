import { useLayoutEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { CloseOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useContractById } from '@/api/contracts/contractApiHooks';
import { useFilesByEntity } from '@/api/files/fileApiHooks';
import { useReferenceData } from '@/api/hooks/useReferences';
import { usePatentById, useUpdatePatent } from '@/api/patents/patentApiHooks';
import { usePatentGrants } from '@/api/patents/patentGrantsApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPatentRidStatus } from '@/components/pageLayout/DetailPageHeader';
import { useNotification } from '@/customhooks/useNotification';
import { formReferenceId } from '@/helpers/formReferenceId';
import { getEntityById } from '@/helpers/getEntityById';
import { getNameById } from '@/helpers/getNameById';
import { patentUpdateFormMapper } from '@/helpers/mappers/patentUpdateFormMapper';
import { formatProjectChipLabel } from '@/pages/contracts/utils/contractDetailsUtils';
import listCardStyles from '@/pages/patents/PatentsListPage.module.scss';
import { formatPatentRegistryCardHeading } from '@/pages/patents/utils/patentRegistryCardUtils';
import {
  earliestPatentRequestsDeadlineFromFiles,
  formatPatentStatusDisplayName,
} from '@/pages/patents/utils/patentStatusDisplay';
import {
  PatentFormIdentityFields,
  PatentFormOrgFields,
  PatentFormRegistrationFields,
  type PatentFormRefs,
} from './components/form';
import { buildPatentFormPayload } from './patentFormPayload';
import type { Patent } from '@/types/patent';
import patentHeaderStyles from './PatentDetails.module.scss';
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
  const { data: patentFiles } = useFilesByEntity('patent', patentId ?? '');
  const { data: patentGrants = [] } = usePatentGrants(patentId ?? '');
  const requestsEarliestDeadline = useMemo(
    () => earliestPatentRequestsDeadlineFromFiles(patentFiles),
    [patentFiles],
  );
  /**
   * После cold start `useEffect` отрабатывает после paint — Ant Design Select иногда показывает value (uuid),
   * пока опции не «привязались». useLayoutEffect + key на Form синхронизируют значения до отрисовки.
   */
  useLayoutEffect(() => {
    if (!patent || !referenceBooks) return;
    form.setFieldsValue(patentUpdateFormMapper(patent, referenceBooks));
  }, [patent, referenceBooks, form]);

  const handleUpdate = (values: Record<string, unknown>) => {
    const payload = buildPatentFormPayload(values) as Partial<Patent>;
    mutate(
      { id: patentId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Патент успешно изменён');
          setTimeout(() => navigate(`/patents/${patentId}`), 1000);
        },
        onError: (e: unknown) => {
          const msg = axios.isAxiosError(e)
            ? (e.response?.data as { message?: string } | undefined)?.message
            : undefined;
          const fallback = e instanceof Error ? e.message : '';
          showNotification('error', 'Ошибка', msg || fallback || 'Не удалось изменить патент');
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
  const watchRegNumber = Form.useWatch('registration_number', form);
  const watchRegNumberCir = Form.useWatch('registration_number_cir', form);
  const watchApplicationNumber = Form.useWatch('application_number', form);
  const watchRegistrationDate = Form.useWatch('registration_date', form);
  const watchProjectId = Form.useWatch('project_id', form);
  const watchResponsibleId = Form.useWatch('responsible_for_patenting_id', form);

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
  const responsibleId = formReferenceId(watchResponsibleId, patent.responsible_for_patenting_id);
  const projectId = formReferenceId(watchProjectId, patent.project_id);
  const ipTypeName = getNameById(intellectpropId, referenceBooks.patentIntellectProps) || '';
  const hasDecisionNegative = (patentFiles ?? []).some(f => f.document_section === 'decision_negative');
  const hasDecisionPositive = (patentFiles ?? []).some(f => f.document_section === 'decision_positive');
  const hasRequestsRequired = (patentFiles ?? []).some(
    f => f.document_section === 'requests' && Boolean(f.response_required),
  );
  const hasGrant = patentGrants.length > 0;
  const currentRegNumberCir = String(watchRegNumberCir ?? patent.registration_number_cir ?? '').trim();
  const currentApplicationNumber = String(watchApplicationNumber ?? patent.application_number ?? '').trim();
  const autoStatusName = hasGrant
    ? 'Получен охранный документ'
    : hasDecisionNegative
      ? 'Отказ в выдаче'
      : hasDecisionPositive
        ? 'Решение о выдаче'
        : hasRequestsRequired
          ? 'Получен запрос, срок ответа до ДД.ММ.ГГГГ'
          : currentApplicationNumber
            ? 'Заявка подана / на рассмотрении в ведомстве'
            : currentRegNumberCir
              ? 'Сдано в ЦИР'
              : 'Подготовка документации';
  const responsibleName = getNameById(responsibleId, referenceBooks.users ?? []) || '—';
  const projectEntity = getEntityById(projectId, referenceBooks.projects ?? []);
  const projectChipLabel = formatProjectChipLabel(projectEntity);
  const headingLine = formatPatentRegistryCardHeading({
    registration_number: headerRegNumber,
    registration_date: watchRegistrationDate ?? patent.registration_date,
    name: headerName,
  });
  const headerStatusBadge = patent.is_deleted
    ? { label: 'Удалён' as const, variant: 'danger' as const }
    : {
        label: formatPatentStatusDisplayName(autoStatusName, requestsEarliestDeadline) || 'Статус не выбран',
        variant: detailHeaderVariantForPatentRidStatus(autoStatusName, requestsEarliestDeadline),
      };

  return (
    <DetailPageHeader
      title={`Редактирование: ${headingLine}`}
      titleWeight='medium'
      backLabel='Реестр РИД'
      onBack={() => navigate(-1)}
      statusBadge={headerStatusBadge}
      subtitle={
        <div className={patentHeaderStyles.detailHeaderSubtitle}>
          <UserOutlined style={{ fontSize: 14 }} />
          <span>{responsibleName}</span>
        </div>
      }
      metaItems={[
        ipTypeName ? (
          <span key='ipType' className={`${listCardStyles.typeChip} ${listCardStyles.chipTight}`}>
            {ipTypeName}
          </span>
        ) : null,
        projectChipLabel ? (
          <span
            key='project'
            className={`${listCardStyles.projectChip} ${listCardStyles.chipTight} ${patentHeaderStyles.detailHeaderProjectChip}`}
          >
            {projectChipLabel}
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
          key={patent.id}
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
            <PatentFormIdentityFields
              refs={refs}
              areasField='multi'
            />
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
