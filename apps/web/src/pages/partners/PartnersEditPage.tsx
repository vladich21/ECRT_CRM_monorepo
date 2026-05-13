import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Modal } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { usePartnerByInn, useUpdatePartner } from '../../api/partners/partnerApiHooks';
import { AsyncBoundary } from '../../components/async/AsyncBoundary';
import DetailPageHeader, { detailHeaderVariantForPartnerStatusName } from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../customhooks/useNotification';
import { getChangedFields } from '../../helpers/getChangedFields';
import { partnerUpdateFormMapper } from '../../helpers/mappers/partnerUpdateFormMapper';
import { partnerUploadFormMapper, type CompanyApiResponse } from '../../helpers/mappers/partnerUploadFormMapper';
import { readAxiosLikeError } from '../../utils/readAxiosLikeError';
import {
  partnerDetailHeaderBadges,
  partnerDetailHeaderMetaItems,
  partnerEditBadgeOptions,
} from './partnerDetailHeaderContent';
import type { PartnerFormRefs, PartnerFormSubmitValues } from './components/form';
import { PartnerFormFields } from './PartnerFormFields';
import { usePartnerEditPageData } from './edit/hooks/usePartnerEditPageData';
import styles from './PartnerFormPage.module.scss';

export default function PartnerEditPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [isFormChanged, setIsFormChanged] = useState(false);
  const {
    partner,
    referenceBooks,
    displayPartner,
    headerLabels,
    isPartnerLoading,
    isPartnerError,
    isReferencesLoading,
    isReferencesError,
    partnerEvalKpi,
    partnerEvalKpiLoading,
    initialEval,
    initialEvalLoading,
  } = usePartnerEditPageData(partnerId, form);
  const { mutate, isPending: isUpdateLoading } = useUpdatePartner();
  const { mutate: getPartnerDataByInn, isPending: isLoadingInn } = usePartnerByInn();
  const isSubmittingRef = useRef(false);
  const isFormInitializedRef = useRef(false);
  const [unarchiveReminderOpen, setUnarchiveReminderOpen] = useState(false);

  useEffect(() => {
    if (partner && referenceBooks?.partnerStatuses && !isFormInitializedRef.current) {
      const archiveEntry = referenceBooks.partnerStatuses.find(
        status => (status.name ?? '').trim() === 'Архив',
      );
      const activeEntry = referenceBooks.partnerStatuses.find(
        status => (status.name ?? '').trim() === 'Активный',
      );
      const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
      const isActive = Boolean(activeEntry && String(partner.status_id) === String(activeEntry.id));
      form.setFieldsValue(partnerUpdateFormMapper(partner, { is_archived: isArchived, is_active: isActive }));
      isFormInitializedRef.current = true;
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
  const handleSave = async (values: PartnerFormSubmitValues) => {
    if (isSubmittingRef.current || !referenceBooks || !partner) return;
    isSubmittingRef.current = true;
    const archiveEntry = referenceBooks.partnerStatuses?.find(
      status => (status.name ?? '').trim() === 'Архив',
    );
    const activeEntry = referenceBooks.partnerStatuses?.find(
      status => (status.name ?? '').trim() === 'Активный',
    );
    const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
    const isActive = Boolean(activeEntry && String(partner.status_id) === String(activeEntry.id));
    const wasUnarchivedFromArchive = isArchived && values.manual_archive === false;
    const payload = getChangedFields(values, partnerUpdateFormMapper(partner, { is_archived: isArchived, is_active: isActive }));
    payload.type_ids = values.type_ids ?? [];
    payload.competence_ids = values.competence_ids ?? [];
    mutate(
      { id: partnerId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Контрагент успешно изменён');
          if (wasUnarchivedFromArchive) {
            setUnarchiveReminderOpen(true);
          } else {
            setTimeout(() => navigate(-1), 1000);
          }
        },
        onError: (error: unknown) => {
          const parsed = readAxiosLikeError(error);
          const message =
            parsed.message?.trim() || (error instanceof Error ? error.message : '') || 'Не удалось изменить контрагента';
          showNotification('error', 'Ошибка', message);
        },
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      },
    );
  };
  return (
    <AsyncBoundary
      isLoading={isReferencesLoading || isPartnerLoading}
      isError={isReferencesError || isPartnerError || !referenceBooks || !partner}
      errorMessage='Контрагент не найден'
    >
      {partner && referenceBooks && displayPartner && headerLabels ? (
        <DetailPageHeader
          title={headerLabels.headerTitle}
          titleWeight='medium'
          backLabel='Реестр контрагентов'
          onBack={() => navigate(-1)}
          statusBadge={
            partner.is_deleted
              ? { label: 'Удалён', variant: 'danger' }
              : headerLabels.statusName
                ? {
                    label: headerLabels.statusName,
                    variant: detailHeaderVariantForPartnerStatusName(headerLabels.statusName),
                  }
                : undefined
          }
          badges={partnerDetailHeaderBadges(
            displayPartner,
            partnerEditBadgeOptions(displayPartner, partner, headerLabels.categoryName),
          )}
          metaItems={partnerDetailHeaderMetaItems(
            displayPartner,
            referenceBooks,
            partnerEvalKpi,
            partnerEvalKpiLoading,
            initialEval,
            initialEvalLoading,
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
                statusDisplayName={headerLabels.statusName ?? '—'}
              />
            </Form>
          </div>
        </DetailPageHeader>
      ) : null}
      <Modal
        title='Восстановление из архива'
        open={unarchiveReminderOpen}
        closable={false}
        maskClosable={false}
        onCancel={() => {
          setUnarchiveReminderOpen(false);
          navigate(-1);
        }}
        footer={[
          <Button
            key='later'
            onClick={() => {
              setUnarchiveReminderOpen(false);
              navigate(-1);
            }}
          >
            Позже
          </Button>,
          <Button
            key='eval'
            type='primary'
            onClick={() => {
              setUnarchiveReminderOpen(false);
              navigate(`/partners/${partnerId}/evaluations`, {
                state: { openInitialSupplierEvaluation: true },
              });
            }}
          >
            Создать оценку
          </Button>,
        ]}
      >
        Контрагент восстановлен из архива. У него нет активных оценок поставщика — для включения в процесс
        оценки необходимо создать первичную оценку.
      </Modal>
    </AsyncBoundary>
  );
}
