import { useEffect, useRef, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { usePartnerByInn, useUpdatePartner } from '../../api/partners/partnerApiHooks';
import { AsyncBoundary } from '../../components/async/AsyncBoundary';
import DetailPageHeader, { detailHeaderVariantForPartnerStatusName } from '../../components/pageLayout/DetailPageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
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
import type { PartnerBlockUiMode } from './components/form/PartnerFormFlagsFields';
import { PartnerFormFields } from './PartnerFormFields';
import { usePartnerEditPageData } from './edit/hooks/usePartnerEditPageData';
import { inferPartnerCategoryKind } from '../../utils/partnerApproval';
import styles from './PartnerFormPage.module.scss';

const { TextArea } = Input;

function resolveBlockUiMode(
  partner: { is_manually_blocked?: boolean; status_id: string },
  statusName: string | null | undefined,
): PartnerBlockUiMode {
  if (partner.is_manually_blocked) return 'manual';
  if ((statusName ?? '').trim() === 'Заблокирован') return 'auto_score';
  return 'none';
}

export default function PartnerEditPage() {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm();
  const [blockForm] = Form.useForm<{ block_comment: string }>();
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
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockModalMode, setBlockModalMode] = useState<'manual_block' | 'manual_unblock' | 'auto_reason'>(
    'manual_block',
  );
  const pendingSaveValuesRef = useRef<PartnerFormSubmitValues | null>(null);

  useEffect(() => {
    if (partner && referenceBooks?.partnerStatuses && !isFormInitializedRef.current) {
      const archiveEntry = referenceBooks.partnerStatuses.find(
        status => (status.name ?? '').trim() === 'Архив',
      );
      const activeEntry = referenceBooks.partnerStatuses.find(
        status => (status.name ?? '').trim() === 'Активный',
      );
      const blockedEntry = referenceBooks.partnerStatuses.find(
        status => (status.name ?? '').trim() === 'Заблокирован',
      );
      const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
      const isActive = Boolean(activeEntry && String(partner.status_id) === String(activeEntry.id));
      const isStatusBlocked = Boolean(
        blockedEntry && String(partner.status_id) === String(blockedEntry.id),
      );
      form.setFieldsValue(
        partnerUpdateFormMapper(partner, {
          is_archived: isArchived,
          is_active: isActive,
          // Чекбокс отражает статус «Заблокирован» (ручной или авто), не блоки по проектам.
          is_manually_blocked: Boolean(partner.is_manually_blocked) || isStatusBlocked,
        }),
      );
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
  const submitPartnerUpdate = (values: PartnerFormSubmitValues, blockComment?: string) => {
    if (isSubmittingRef.current || !referenceBooks || !partner) return;
    isSubmittingRef.current = true;
    const archiveEntry = referenceBooks.partnerStatuses?.find(
      status => (status.name ?? '').trim() === 'Архив',
    );
    const activeEntry = referenceBooks.partnerStatuses?.find(
      status => (status.name ?? '').trim() === 'Активный',
    );
    const blockedEntry = referenceBooks.partnerStatuses?.find(
      status => (status.name ?? '').trim() === 'Заблокирован',
    );
    const isArchived = Boolean(archiveEntry && String(partner.status_id) === String(archiveEntry.id));
    const isActive = Boolean(activeEntry && String(partner.status_id) === String(activeEntry.id));
    const isStatusBlocked = Boolean(
      blockedEntry && String(partner.status_id) === String(blockedEntry.id),
    );
    const wasUnarchivedFromArchive = isArchived && values.manual_archive === false;
    const baseline = partnerUpdateFormMapper(partner, {
      is_archived: isArchived,
      is_active: isActive,
      is_manually_blocked: Boolean(partner.is_manually_blocked) || isStatusBlocked,
    });
    const payload = getChangedFields(values, baseline) as Record<string, unknown>;
    payload.type_ids = values.type_ids ?? [];
    payload.competence_ids = values.competence_ids ?? [];
    if (blockComment) {
      payload.block_comment = blockComment;
      if (blockModalMode === 'manual_block') {
        payload.manual_blocked = true;
      }
      if (blockModalMode === 'manual_unblock') {
        payload.manual_blocked = false;
      }
      // Обычный comment контрагента не перезаписываем — причина в block_reason.
    }
    mutate(
      { id: partnerId!, data: payload },
      {
        onSuccess: () => {
          showNotification('success', 'Успех', 'Контрагент успешно изменен');
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

  const handleSave = async (values: PartnerFormSubmitValues) => {
    if (!partner) return;
    const blockUiMode = resolveBlockUiMode(partner, headerLabels?.statusName);
    // Confirm только при новой ручной блокировке (не повтор и не авто).
    const willNewManualBlock =
      values.manual_blocked === true &&
      !partner.is_manually_blocked &&
      blockUiMode !== 'auto_score';
    if (willNewManualBlock) {
      pendingSaveValuesRef.current = values;
      setBlockModalMode('manual_block');
      blockForm.resetFields();
      setBlockConfirmOpen(true);
      return;
    }
    // Снятие ручной блокировки — обязательная причина → комментарий + block_reason.
    const willManualUnblock =
      values.manual_blocked === false &&
      Boolean(partner.is_manually_blocked) &&
      blockUiMode === 'manual';
    if (willManualUnblock) {
      pendingSaveValuesRef.current = values;
      setBlockModalMode('manual_unblock');
      blockForm.resetFields();
      setBlockConfirmOpen(true);
      return;
    }
    // Автоблок: чекбокс disabled=ON — не шлём manual_blocked:false;
    // если причины ещё нет — обязательная модалка в то же поле block_reason.
    if (blockUiMode === 'auto_score') {
      const { manual_blocked: _ignored, ...rest } = values;
      if (!partner.block_reason?.trim()) {
        pendingSaveValuesRef.current = rest as PartnerFormSubmitValues;
        setBlockModalMode('auto_reason');
        blockForm.resetFields();
        setBlockConfirmOpen(true);
        return;
      }
      submitPartnerUpdate(rest as PartnerFormSubmitValues);
      return;
    }
    submitPartnerUpdate(values);
  };

  const handleConfirmBlock = async () => {
    try {
      const { block_comment } = await blockForm.validateFields();
      const values = pendingSaveValuesRef.current;
      if (!values) return;
      setBlockConfirmOpen(false);
      pendingSaveValuesRef.current = null;
      submitPartnerUpdate(values, block_comment.trim());
    } catch {
      /* validation */
    }
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
              ? { label: 'Удален', variant: 'danger' }
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
                statusDisplayName={headerLabels.statusName ?? '-'}
                blockUiMode={resolveBlockUiMode(partner, headerLabels.statusName)}
                projectBlocksCount={partnerEvalKpi?.blockedProjectCount ?? 0}
                unblockLockedByLowScore={
                  inferPartnerCategoryKind(headerLabels.categoryName) === 'engineering' &&
                  partnerEvalKpi?.avgScore != null &&
                  partnerEvalKpi.avgScore < 2
                }
              />
            </Form>
          </div>
        </DetailPageHeader>
      ) : null}
      <Modal
        title={
          blockModalMode === 'manual_unblock'
            ? 'Снятие блокировки'
            : blockModalMode === 'auto_reason'
              ? 'Причина блокировки'
              : 'Блокировка контрагента'
        }
        open={blockConfirmOpen}
        okText={
          blockModalMode === 'manual_unblock'
            ? 'Снять блокировку'
            : blockModalMode === 'auto_reason'
              ? 'Сохранить'
              : 'Заблокировать'
        }
        cancelText='Отмена'
        okButtonProps={{
          danger: blockModalMode === 'manual_block',
          loading: isUpdateLoading,
        }}
        onCancel={() => {
          setBlockConfirmOpen(false);
          pendingSaveValuesRef.current = null;
        }}
        onOk={() => void handleConfirmBlock()}
        destroyOnHidden
      >
        <p style={{ marginBottom: 12 }}>
          {blockModalMode === 'manual_unblock'
            ? 'Укажите причину снятия блокировки — она сохранится в поле «Причина блокировки/разблокировки» и во вкладке «Комментарии».'
            : blockModalMode === 'auto_reason'
              ? 'Контрагент заблокирован автоматически (средняя оценка по проектам ниже 2). Укажите причину блокировки — она отобразится на вкладке «Основное» отдельно от обычного комментария.'
              : 'Контрагент будет переведён в статус «Заблокирован». Укажите обязательную причину — она сохранится в поле «Причина блокировки/разблокировки» на вкладке «Основное» и во вкладке «Комментарии».'}
        </p>
        <Form form={blockForm} layout='vertical'>
          <Form.Item
            name='block_comment'
            label='Причина блокировки/разблокировки'
            rules={[
              {
                required: true,
                message:
                  blockModalMode === 'manual_unblock'
                    ? 'Укажите причину снятия блокировки'
                    : 'Укажите причину блокировки',
              },
              {
                whitespace: true,
                message:
                  blockModalMode === 'manual_unblock'
                    ? 'Укажите причину снятия блокировки'
                    : 'Укажите причину блокировки',
              },
            ]}
          >
            <TextArea
              rows={4}
              placeholder={
                blockModalMode === 'manual_unblock'
                  ? 'Почему снимаете блокировку'
                  : 'Почему блокируете контрагента'
              }
              maxLength={2000}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
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
        Контрагент восстановлен из архива. У него нет активных оценок поставщика - для включения в процесс
        оценки необходимо создать первичную оценку.
      </Modal>
    </AsyncBoundary>
  );
}
