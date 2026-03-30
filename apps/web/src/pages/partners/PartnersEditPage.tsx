import { useEffect, useMemo, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '../../api/hooks/useReferences';
import { usePartnerById, usePartnerByInn, useUpdatePartner } from '../../api/partners/partnerApiHooks';
import { usePartnerSupplierEvalKpi } from '../../api/supplierEvaluations/supplierEvaluationApiHooks';
import { Loader } from '../../components/loader/Loader';
import { NotFound } from '../../components/notFound/NotFound';
import DetailPageHeader, { detailHeaderVariantForPartnerStatusName } from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { getChangedFields } from '../../helpers/getChangedFields';
import { partnerUpdateFormMapper } from '../../helpers/mappers/partnerUpdateFormMapper';
import { partnerUploadFormMapper, type CompanyApiResponse } from '../../helpers/mappers/partnerUploadFormMapper';
import type { Partner } from '../../types/partner';
import { mergePartnerSupplierEvalKpiWithUiMock } from './evaluations/partnerEvaluationsUiMock';
import {
  partnerDetailHeaderBadges,
  partnerDetailHeaderMetaItems,
  partnerEditBadgeOptions,
} from './partnerDetailHeaderContent';
import type { PartnerFormRefs, PartnerFormSubmitValues } from './components/form';
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
  const { mutate, isPending: isUpdateLoading } = useUpdatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  const isSubmittingRef = useRef(false);
  const wName = Form.useWatch('name', form) as string | undefined;
  const wShortName = Form.useWatch('short_name', form) as string | undefined;
  const wInn = Form.useWatch('inn', form) as string | undefined;
  const wTypeIds = Form.useWatch('type_ids', form) as string[] | undefined;
  const wActualAddress = Form.useWatch('actual_address', form) as string | undefined;
  const wLegal = Form.useWatch('legal_check_passed', form) as boolean | undefined;
  const wQuestionnaire = Form.useWatch('questionnaire_filled', form) as boolean | undefined;
  const wInitial = Form.useWatch('initial_assessment_done', form) as boolean | undefined;
  const wKey = Form.useWatch('is_key_supplier', form) as boolean | undefined;
  const wTarget = Form.useWatch('is_targeted', form) as boolean | undefined;
  const wCategoryId = Form.useWatch('category_id', form) as string | undefined;

  const { data: partnerEvalKpiRaw, isLoading: partnerEvalKpiLoading } = usePartnerSupplierEvalKpi(
    partnerId,
    Boolean(partnerId),
  );
  const partnerEvalKpi = useMemo(
    () => mergePartnerSupplierEvalKpiWithUiMock(partnerId ?? '', partnerEvalKpiRaw),
    [partnerId, partnerEvalKpiRaw],
  );

  const displayPartner: Partner | null = useMemo(() => {
    if (!partner) return null;
    return {
      ...partner,
      inn: wInn ?? partner.inn,
      short_name: wShortName ?? partner.short_name,
      name: wName ?? partner.name,
      type_ids: wTypeIds ?? partner.type_ids,
      actual_address: wActualAddress ?? partner.actual_address,
      is_key_supplier: wKey ?? partner.is_key_supplier,
      is_targeted: wTarget ?? partner.is_targeted,
      legal_check_passed: wLegal ?? partner.legal_check_passed,
      questionnaire_filled: wQuestionnaire ?? partner.questionnaire_filled,
      initial_assessment_done: wInitial ?? partner.initial_assessment_done,
    };
  }, [
    partner,
    wInn,
    wShortName,
    wName,
    wTypeIds,
    wActualAddress,
    wKey,
    wTarget,
    wLegal,
    wQuestionnaire,
    wInitial,
  ]);

  useEffect(() => {
    if (partner && referenceBooks?.partnerStatuses) {
      const archiveEntry = referenceBooks.partnerStatuses.find(s => (s.name ?? '').trim() === 'Архив');
      const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
      form.setFieldsValue(partnerUpdateFormMapper(partner, { is_archived: isArchived }));
    }
  }, [partner, referenceBooks, form]);
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
  if (isReferencesLoading || isPartnerLoading) {
    return <Loader />;
  }
  if (isReferencesError || isPartnerError || !referenceBooks || !partner || !displayPartner) {
    return <NotFound errorMessage='Контрагент не найден' />;
  }
  const headerTitle = (displayPartner.short_name || displayPartner.name || 'Контрагент').trim() || 'Контрагент';
  const categoryName =
    referenceBooks.partnerCategories?.find(
      c => String(c.id) === String(wCategoryId ?? partner.category_id),
    )?.name ?? null;
  const statusName = referenceBooks.partnerStatuses?.find(
    status => String(status.id) === String(partner.status_id),
  )?.name;
  const handleSave = async (values: PartnerFormSubmitValues) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    const archiveEntry = referenceBooks.partnerStatuses?.find(s => (s.name ?? '').trim() === 'Архив');
    const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
    const payload = getChangedFields(values, partnerUpdateFormMapper(partner, { is_archived: isArchived }));
    payload.type_ids = values.type_ids ?? [];
    payload.competence_ids = values.competence_ids ?? [];
    mutate(
      { id: partnerId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Контрагент успешно изменён');
          setTimeout(() => navigate(-1), 1000);
        },
        onError: (error: Error) => {
          const message = error?.message || 'Не удалось изменить контрагента';
          showNotification('error', 'Ошибка', message);
        },
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  };
  return (
    <DetailPageHeader
      title={headerTitle}
      titleWeight='medium'
      backLabel='Реестр контрагентов'
      onBack={() => navigate(-1)}
      statusBadge={
        partner.is_deleted
          ? { label: 'Удалён', variant: 'danger' }
          : statusName
            ? { label: statusName, variant: detailHeaderVariantForPartnerStatusName(statusName) }
            : undefined
      }
      badges={partnerDetailHeaderBadges(displayPartner, partnerEditBadgeOptions(displayPartner, partner, categoryName))}
      metaItems={partnerDetailHeaderMetaItems(
        displayPartner,
        referenceBooks,
        partnerEvalKpi,
        partnerEvalKpiLoading,
      )}
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
            referenceBooks={referenceBooks as PartnerFormRefs}
            disabled={isUpdateLoading}
            onUploadByInn={handleUploadByInn}
            isLoadingInn={isLoadingInn}
            formMode='edit'
            statusDisplayName={statusName ?? '—'}
          />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
