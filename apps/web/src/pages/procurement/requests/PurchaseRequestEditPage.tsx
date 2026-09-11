import { useEffect, useState } from 'react';
import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Form } from 'antd';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import {
  usePurchaseRequestDetail,
  useUpdatePurchaseRequest,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { useProjectsPreview } from '@/api/projects/projectApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader from '@/components/pageLayout/DetailPageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import { useAuthStore } from '@/store/AuthStore';

import { PurchaseRequestDraftFields, type PurchaseRequestDraftFormValues } from './PurchaseRequestDraftFields';
import styles from './PurchaseRequestFormPage.module.scss';
import { applyPurchaseRequestFormErrors, toDraftFormValues, toUpdatePayload } from './purchaseRequestFormUtils';
import { purchaseRequestHeaderBadgeVariant, purchaseRequestStatusLabel } from './purchaseRequestLabels';
import { purchaseRequestWritableFields } from './purchaseRequestPolicy';
import { useIncomeContractOptions } from './useIncomeContractOptions';

const EDIT_TAB = 'edit';

export default function PurchaseRequestEditPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm<PurchaseRequestDraftFormValues>();
  const [isDirty, setIsDirty] = useState(false);
  const userId = useAuthStore(state => state.user?.id);
  const { data: request, isLoading, isError, refetch } = usePurchaseRequestDetail(requestId);
  const { mutate, isPending } = useUpdatePurchaseRequest();
  const { data: projects = [], isLoading: projectsLoading } = useProjectsPreview();
  const { data: references, isLoading: refsLoading } = useReferenceData(['departments']);
  const { contracts, isLoading: contractsLoading } = useIncomeContractOptions(request?.income_contract_id);

  useEffect(() => {
    if (!request) return;
    form.setFieldsValue(toDraftFormValues(request));
    setIsDirty(false);
  }, [form, request?.id, request?.updated_at]);

  const goToCard = () => {
    if (requestId) navigate(`/procurement/requests/${requestId}`);
    else navigate('/procurement/requests');
  };

  if (isLoading || projectsLoading || refsLoading || contractsLoading) {
    return <Loader />;
  }
  if (isError) {
    return (
      <div className={styles.wrap}>
        <Alert
          type='error'
          showIcon
          message='Не удалось загрузить запрос'
          action={
            <Button size='small' onClick={() => void refetch()}>
              Повторить
            </Button>
          }
        />
      </div>
    );
  }
  if (!request || !references) {
    return <NotFound errorMessage='Запрос не найден' />;
  }
  const writable = purchaseRequestWritableFields(request, userId);
  if (writable.size === 0) {
    return (
      <NotFound
        errorMessage={
          request.status === 'in_elaboration'
            ? 'Проработку меняет только назначенный ведущий ОУП'
            : 'Черновик может изменить только инициатор'
        }
      />
    );
  }

  const handleSave = (values: PurchaseRequestDraftFormValues) => {
    mutate(
          { id: request.id, payload: toUpdatePayload(values, request, writable) },
      {
        onSuccess: () => {
          showNotification(
            'success',
            request.status === 'in_elaboration' ? 'Проработка сохранена' : 'Черновик сохранен',
          );
          setIsDirty(false);
          navigate(`/procurement/requests/${request.id}`);
        },
        onError: error => {
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            showNotification('error', 'Карточка изменена', 'Обновите данные и повторите сохранение');
            void refetch();
            return;
          }
          const message = applyPurchaseRequestFormErrors(form, error);
          showNotification('error', 'Не удалось сохранить', message);
        },
      },
    );
  };

  return (
    <DetailPageHeader
      title={`Запрос № ${request.number}`}
      titleWeight='medium'
      subtitle={request.subject}
      backLabel='К карточке'
      onBack={goToCard}
      statusBadge={{
        label: purchaseRequestStatusLabel(request.status),
        variant: purchaseRequestHeaderBadgeVariant(request.status),
      }}
      actions={
        <>
          <Button icon={<CloseOutlined />} onClick={goToCard} disabled={isPending}>
            Отмена
          </Button>
          <Button
            type='primary'
            icon={<SaveOutlined />}
            loading={isPending}
            disabled={!isDirty}
            onClick={() => form.submit()}
          >
            Сохранить
          </Button>
        </>
      }
      tabs={[{ key: EDIT_TAB, label: 'Редактирование' }]}
      activeTab={EDIT_TAB}
      onTabChange={() => undefined}
      stickyHeader
      contextHolder={contextHolder}
    >
      <div className={styles.formCard}>
        <Form<PurchaseRequestDraftFormValues>
          form={form}
          layout='vertical'
          requiredMark
          onValuesChange={() => setIsDirty(true)}
          onFinish={handleSave}
          scrollToFirstError
        >
          <PurchaseRequestDraftFields
            writable={writable}
            projects={projects}
            departments={references.departments ?? []}
            incomeContracts={contracts}
          />
        </Form>
      </div>
    </DetailPageHeader>
  );
}
