import { useEffect, useState } from 'react';
import { SaveOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Form } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useReferenceData } from '@/api/hooks/useReferences';
import {
  useCreatePurchaseRequest,
  useSubmitPurchaseRequest,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { useProjectsPreview } from '@/api/projects/projectApiHooks';
import { BackButton } from '@/components/backButton/BackButton';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import { PageHeader } from '@/components/pageLayout/PageHeader';
import { useNotification } from '@/hooks/notifications/useNotification';
import { useAuthStore } from '@/store/AuthStore';

import { parseIncomeCreatePrefill } from './incomeContracts';
import { PurchaseRequestDraftFields, type PurchaseRequestDraftFormValues } from './PurchaseRequestDraftFields';
import styles from './PurchaseRequestFormPage.module.scss';
import { applyPurchaseRequestFormErrors, toCreatePayload } from './purchaseRequestFormUtils';
import { PurchaseRequestSubmitModal } from './PurchaseRequestSubmitModal';
import { SUBMIT_MANDATORY_STEP_ORDERS } from './purchaseRequestPolicy';
import { useIncomeContractOptions } from './useIncomeContractOptions';

export default function PurchaseRequestCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefill = parseIncomeCreatePrefill(searchParams);
  const { showNotification, contextHolder } = useNotification();
  const [form] = Form.useForm<PurchaseRequestDraftFormValues>();
  const user = useAuthStore(state => state.user);
  const { mutate, isPending } = useCreatePurchaseRequest();
  const { mutate: submit, isPending: submitting } = useSubmitPurchaseRequest();
  const [pendingSubmitId, setPendingSubmitId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'draft' | 'send' | null>(null);
  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useProjectsPreview();
  const { data: references, isLoading: refsLoading, isError: refsError } = useReferenceData(['departments']);
  const { contracts, isLoading: contractsLoading, isError: contractsError } = useIncomeContractOptions(
    prefill.contractId,
  );

  useEffect(() => {
    const departmentId = user?.department?.id;
    if (departmentId && !form.getFieldValue('department_id')) {
      form.setFieldValue('department_id', departmentId);
    }
  }, [form, user?.department?.id]);

  useEffect(() => {
    if (!prefill.contractId) return;
    form.setFieldsValue({
      funding_source: 'income_contract',
      income_contract_id: prefill.contractId,
      income_stage_id: prefill.stageId,
    });
    const contract = contracts.find(row => row.id === prefill.contractId);
    if (contract?.project_id && !form.getFieldValue('project_id')) {
      form.setFieldValue('project_id', contract.project_id);
    }
  }, [form, prefill.contractId, prefill.stageId, contracts]);

  if (projectsLoading || refsLoading || contractsLoading) {
    return <Loader />;
  }
  if (projectsError || refsError || contractsError || !references) {
    return <NotFound errorMessage='Не удалось подгрузить справочники' />;
  }

  const handleCreate = (values: PurchaseRequestDraftFormValues) => {
    setPendingAction('draft');
    mutate(toCreatePayload(values), {
      onSuccess: created => {
        showNotification('success', 'Запрос создан', `Номер ${created.number}`);
        navigate(`/procurement/requests/${created.id}`, { replace: true });
      },
      onError: error => {
        setPendingAction(null);
        const message = applyPurchaseRequestFormErrors(form, error);
        showNotification('error', 'Не удалось создать запрос', message);
      },
    });
  };

  const handleCreateAndSend = () => {
    form
      .validateFields()
      .then(values => {
        setPendingAction('send');
        mutate(toCreatePayload(values), {
          onSuccess: created => {
            showNotification('success', 'Запрос создан', `Номер ${created.number}`);
            setPendingSubmitId(created.id);
          },
          onError: error => {
            setPendingAction(null);
            const message = applyPurchaseRequestFormErrors(form, error);
            showNotification('error', 'Не удалось создать запрос', message);
          },
        });
      })
      .catch(() => {});
  };

  return (
    <div className={styles.wrap}>
      {contextHolder}
      <BackButton path='/procurement/requests' />
      <PageHeader
        title='Новый запрос на закупку'
        subtitle={prefill.contractId ? 'На основании доходного договора' : undefined}
      />
      <div className={styles.formCard}>
        <Form<PurchaseRequestDraftFormValues>
          form={form}
          layout='vertical'
          requiredMark
          initialValues={{
            is_urgent: false,
            ...(prefill.contractId
              ? {
                  funding_source: 'income_contract' as const,
                  income_contract_id: prefill.contractId,
                  income_stage_id: prefill.stageId,
                }
              : {}),
          }}
          onFinish={handleCreate}
          scrollToFirstError
        >
          <PurchaseRequestDraftFields
            projects={projects}
            departments={references.departments ?? []}
            incomeContracts={contracts}
            departmentPrefillHint
          />
          <div className={styles.formActions}>
            <Button onClick={() => navigate('/procurement/requests')}>Отмена</Button>
            <Button icon={<SendOutlined />} loading={isPending && pendingAction === 'send'} onClick={handleCreateAndSend}>
              Отправить
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              icon={<SaveOutlined />}
              loading={isPending && pendingAction === 'draft'}
            >
              Сохранить как черновик
            </Button>
          </div>
        </Form>
      </div>
      <PurchaseRequestSubmitModal
        open={pendingSubmitId != null}
        confirmLoading={submitting}
        onCancel={() => {
          if (pendingSubmitId) navigate(`/procurement/requests/${pendingSubmitId}`, { replace: true });
        }}
        onConfirm={includeInitiatorHead => {
          if (!pendingSubmitId) return;
          submit(
            {
              id: pendingSubmitId,
              includedStepOrders: includeInitiatorHead ? undefined : SUBMIT_MANDATORY_STEP_ORDERS,
            },
            {
              onSuccess: () => {
                showNotification('success', 'Запрос отправлен на утверждение');
                navigate(`/procurement/requests/${pendingSubmitId}`, { replace: true });
              },
              onError: error => {
                showNotification('error', 'Не удалось отправить', getApiErrorMessage(error) ?? 'Ошибка отправки');
              },
            },
          );
        }}
      />
    </div>
  );
}
