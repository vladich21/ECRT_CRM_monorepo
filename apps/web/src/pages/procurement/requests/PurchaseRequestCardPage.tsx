import { useState } from 'react';
import {
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  ProjectOutlined,
  SendOutlined,
  SwapOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, Button, Modal, Space } from 'antd';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

import { useApprovalState } from '@/api/approvals/approvalApiHooks';
import {
  useAssignPurchaseRequestLead,
  usePurchaseRequestComparison,
  usePurchaseRequestDetail,
  useReplacePurchaseRequestIncomeContract,
  useSendPurchaseRequestToAgreement,
  useSubmitPurchaseRequest,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import {
  PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
  PURCHASE_REQUEST_ENTITY_TYPE,
} from '@/api/procurement/requests/procurementRequestApi';
import { ApprovalPanel } from '@/components/approvals/ApprovalPanel';
import { DEFAULT_APPROVAL_VOCABULARY, PURCHASE_REQUEST_APPROVAL_VOCABULARY } from '@/components/approvals/approvalVocabulary';
import { CanAccess } from '@/components/canAccess/CanAccess';
import { EntityFilesTab } from '@/components/entityFiles/EntityFilesTab';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailHeaderStatusBadgeClass } from '@/components/pageLayout/DetailPageHeader';
import headerStyles from '@/components/pageLayout/DetailPageHeader.module.scss';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';
import { SECTIONS } from '@/shared/permissions';
import { useAuthStore } from '@/store/AuthStore';

import { PurchaseRequestAssignLeadModal } from './PurchaseRequestAssignLeadModal';
import { PurchaseRequestChangeIncomeModal } from './PurchaseRequestChangeIncomeModal';
import { PurchaseRequestElaboration } from './PurchaseRequestElaboration';
import { PurchaseRequestJournal } from './PurchaseRequestJournal';
import { PurchaseRequestMainInfo } from './PurchaseRequestMainInfo';
import { PurchaseRequestMethod } from './PurchaseRequestMethod';
import {
  formatPurchaseRequestAmount,
  formatPurchaseRequestDate,
  purchaseRequestHeaderBadgeVariant,
  purchaseRequestStatusLabel,
} from './purchaseRequestLabels';
import {
  canAssignPurchaseRequestLead,
  canChangePurchaseRequestIncomeLink,
  canEditPurchaseRequestDraft,
  canEditPurchaseRequestElaboration,
  canSendPurchaseRequestToAgreement,
  canSetPurchaseRequestMethod,
  canChoosePurchaseRequestRoute,
  canSubmitPurchaseRequest,
  needsIncomeContractForApprove,
} from './purchaseRequestPolicy';

const REQUISITES_TAB = 'requisites';
const ELABORATION_TAB = 'elaboration';
const METHOD_TAB = 'method';
const APPROVAL_TAB = 'approval';
const FILES_TAB = 'files';
const HISTORY_TAB = 'history';

function defaultCardTab(status: string): string {
  if (status === 'in_elaboration') return ELABORATION_TAB;
  if (status === 'agreed') return METHOD_TAB;
  if (status === 'pending_approval' || status === 'rejected' || status === 'in_agreement') {
    return APPROVAL_TAB;
  }
  return REQUISITES_TAB;
}

function showElaborationTab(status: string): boolean {
  return status === 'in_elaboration' || status === 'in_agreement' || status === 'agreed';
}

function showMethodTab(status: string): boolean {
  return status === 'agreed';
}

const VI4_DECISION_LABELS = {
  approved: 'Утвердить',
  rejected: 'Отклонить',
  returned_to_initiator: 'Вернуть',
} as const;

const AGREEMENT_DECISION_LABELS = {
  approved: 'Согласовать',
  rejected: 'Отклонить',
  returned_to_initiator: 'Вернуть',
} as const;

export default function PurchaseRequestCardPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<string>();
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);
  const { showNotification, contextHolder } = useNotification();
  const userId = useAuthStore(state => state.user?.id);
  const { data: request, isLoading, isError, refetch } = usePurchaseRequestDetail(requestId);
  const { mutate: replaceIncome, isPending: replacingIncome } = useReplacePurchaseRequestIncomeContract();
  const { mutate: submit, isPending: submitting } = useSubmitPurchaseRequest();
  const { mutate: sendToAgreement, isPending: sendingAgreement } = useSendPurchaseRequestToAgreement();
  const { mutate: assignLead, isPending: assigningLead } = useAssignPurchaseRequestLead();
  const { data: approvalState } = useApprovalState(PURCHASE_REQUEST_ENTITY_TYPE, request?.id);
  const { data: agreementState } = useApprovalState(PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE, request?.id);
  const { data: comparison } = usePurchaseRequestComparison(
    request?.id,
    request?.status === 'in_elaboration',
  );

  if (isLoading) {
    return <Loader />;
  }
  if (isError) {
    return (
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
    );
  }
  if (!request) {
    return <NotFound errorMessage='Запрос не найден' />;
  }

  const canEditDraft = canEditPurchaseRequestDraft(request, userId);
  const canEditElaboration = canEditPurchaseRequestElaboration(request, userId);
  const canEdit = canEditDraft || canEditElaboration;
  const canAssignLead = canAssignPurchaseRequestLead(request);
  const canSubmit = canSubmitPurchaseRequest(request, userId) && !approvalState?.can_resubmit;
  const canSendToAgreement = canSendPurchaseRequestToAgreement(request, userId);
  const canSetMethod = canSetPurchaseRequestMethod(request, userId);
  const showAgreementPanel =
    request.status === 'in_agreement' ||
    request.status === 'agreed' ||
    Boolean(agreementState?.has_active_process);
  const missingIncome = needsIncomeContractForApprove(request);
  const canChangeIncome = canChangePurchaseRequestIncomeLink(request, userId, {
    canApprove: approvalState?.can_approve,
  });
  const approveBlockedReason =
    missingIncome && request.status === 'pending_approval'
      ? 'Укажите доходный договор, иначе утвердить нельзя. Отклонить или вернуть можно без договора.'
      : null;

  const postToAgreement = (confirmExpiring: boolean) => {
    sendToAgreement(
      {
        id: request.id,
        payload: {
          updated_at: request.updated_at,
          confirm_expiring_quote: confirmExpiring || undefined,
        },
      },
      {
        onSuccess: () => {
          setTab(APPROVAL_TAB);
          showNotification('success', 'Запрос отправлен на согласование');
        },
        onError: (error: unknown) => {
          if (axios.isAxiosError(error) && error.response?.status === 428) {
            Modal.confirm({
              title: 'Срок действия КП истекает',
              content: 'До конца срока КП меньше 5 рабочих дней. Отправить на согласование всё равно?',
              okText: 'Отправить',
              cancelText: 'Отмена',
              onOk: () => postToAgreement(true),
            });
            return;
          }
          if (axios.isAxiosError(error) && error.response?.status === 409) {
            showNotification('error', 'Карточка изменена', 'Обновите данные и повторите отправку');
            void refetch();
            return;
          }
          if (axios.isAxiosError(error) && error.response?.status === 403) {
            showNotification('error', 'Недостаточно прав', 'Отправить может только назначенный ведущий ОУП');
            return;
          }
          showNotification(
            'error',
            'Не удалось отправить на согласование',
            getApiErrorMessage(error) ?? 'Ошибка отправки',
          );
        },
      },
    );
  };

  const handleSendToAgreement = () => {
    if (comparison?.quotes.some(quote => quote.is_expiring)) {
      Modal.confirm({
        title: 'Срок действия КП истекает',
        content: 'До конца срока КП меньше 5 рабочих дней. Отправить на согласование всё равно?',
        okText: 'Отправить',
        cancelText: 'Отмена',
        onOk: () => postToAgreement(true),
      });
      return;
    }
    postToAgreement(false);
  };

  const activeTab = tab ?? defaultCardTab(request.status);
  const tabs = [
    { key: REQUISITES_TAB, label: 'Реквизиты' },
    ...(showElaborationTab(request.status) ? [{ key: ELABORATION_TAB, label: 'Проработка' }] : []),
    {
      key: APPROVAL_TAB,
      label: showAgreementPanel ? 'Согласование' : 'Утверждение',
    },
    ...(showMethodTab(request.status) ? [{ key: METHOD_TAB, label: 'Способ закупки' }] : []),
    { key: FILES_TAB, label: 'Файлы' },
    { key: HISTORY_TAB, label: 'История' },
  ];

  const requestActions = canEdit || canChangeIncome || canSubmit || canSendToAgreement ? (
    <Space>
      {canChangeIncome ? (
        <Button icon={<SwapOutlined />} onClick={() => setIncomeOpen(true)}>
          Сменить договор
        </Button>
      ) : null}
      {canEdit ? (
        <CanAccess section={SECTIONS.PROCUREMENT_REQUESTS} action='edit'>
          <Button icon={<EditOutlined />} onClick={() => navigate(`/procurement/requests/${request.id}/edit`)}>
            Редактировать
          </Button>
        </CanAccess>
      ) : null}
      {canSubmit ? (
        <CanAccess section={SECTIONS.PROCUREMENT_REQUESTS} action='edit'>
          <Button
            type='primary'
            icon={<SendOutlined />}
            loading={submitting}
            onClick={() => {
              submit(request.id, {
                onSuccess: () => {
                  setTab(APPROVAL_TAB);
                  showNotification('success', 'Запрос отправлен на утверждение');
                },
                onError: error => {
                  if (axios.isAxiosError(error) && error.response?.status === 409) {
                    showNotification('error', 'Отправить можно только черновик');
                    return;
                  }
                  showNotification('error', 'Не удалось отправить', getApiErrorMessage(error) ?? 'Ошибка отправки');
                },
              });
            }}
          >
            Отправить
          </Button>
        </CanAccess>
      ) : null}
      {canSendToAgreement ? (
        <Button
          type='primary'
          icon={<SendOutlined />}
          loading={sendingAgreement}
          onClick={handleSendToAgreement}
        >
          Отправить на согласование
        </Button>
      ) : null}
    </Space>
  ) : null;

  const headerActions =
    canAssignLead || requestActions ? (
      <Space>
        {canAssignLead ? (
          <CanAccess section={SECTIONS.PROCUREMENT_LEAD} action='edit'>
            <Button icon={<UserAddOutlined />} onClick={() => setLeadOpen(true)}>
              {request.lead_manager_id ? 'Сменить ведущего' : 'Назначить'}
            </Button>
          </CanAccess>
        ) : null}
        {requestActions}
      </Space>
    ) : undefined;

  return (
    <>
      {contextHolder}
      <DetailPageHeader
        title={`Запрос № ${request.number}`}
        titleWeight='medium'
        subtitle={request.subject}
        backLabel='Реестр запросов'
        onBack={() => navigate('/procurement/requests')}
        statusBadge={{
          label: purchaseRequestStatusLabel(request.status),
          variant: purchaseRequestHeaderBadgeVariant(request.status),
        }}
        badges={
          request.is_urgent
            ? [
                <div key='urgent' className={detailHeaderStatusBadgeClass('danger')}>
                  Срочно
                </div>,
              ]
            : undefined
        }
        metaItems={[
          <span key='project' className={headerStyles.metaText}>
            <ProjectOutlined /> {request.project_name || 'Проект не указан'}
          </span>,
          <span key='initiator' className={headerStyles.metaText}>
            <UserOutlined /> {request.initiator_name || 'Инициатор не указан'}
          </span>,
          <span key='amount' className={headerStyles.metaText}>
            <DollarOutlined /> {formatPurchaseRequestAmount(request.amount, request.currency_code)}
          </span>,
          <span key='date' className={headerStyles.metaText}>
            <CalendarOutlined /> {formatPurchaseRequestDate(request.request_date)}
          </span>,
        ]}
        actions={headerActions}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setTab}
      >
        <Space direction='vertical' size='middle' style={{ width: '100%' }}>
          {activeTab === HISTORY_TAB ? (
            <PurchaseRequestJournal requestId={request.id} />
          ) : activeTab === FILES_TAB ? (
            <EntityFilesTab entityType={PURCHASE_REQUEST_ENTITY_TYPE} entityId={request.id} />
          ) : activeTab === APPROVAL_TAB ? (
            <>
              {approveBlockedReason ? <Alert type='warning' showIcon message={approveBlockedReason} /> : null}
              <ApprovalPanel
                variant='compact'
                hideGenericStart
                entityType={showAgreementPanel ? PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE : PURCHASE_REQUEST_ENTITY_TYPE}
                entityId={request.id}
                decisionLabels={showAgreementPanel ? AGREEMENT_DECISION_LABELS : VI4_DECISION_LABELS}
                vocabulary={showAgreementPanel ? DEFAULT_APPROVAL_VOCABULARY : PURCHASE_REQUEST_APPROVAL_VOCABULARY}
                approveBlockedReason={showAgreementPanel ? null : approveBlockedReason}
                emptyDescription={
                  showAgreementPanel
                    ? 'Еще не отправлено. Кнопка «Отправить на согласование» — в шапке карточки.'
                    : 'Еще не отправлено. Кнопка «Отправить» — в шапке карточки.'
                }
              />
            </>
          ) : activeTab === METHOD_TAB ? (
            <PurchaseRequestMethod
              request={request}
              canEdit={canSetMethod}
              canRoute={canChoosePurchaseRequestRoute(request, userId)}
            />
          ) : activeTab === ELABORATION_TAB ? (
            <PurchaseRequestElaboration
              request={request}
              canAssign={canAssignLead}
              canEdit={canEditElaboration}
              onAssign={() => setLeadOpen(true)}
            />
          ) : (
            <PurchaseRequestMainInfo request={request} />
          )}
        </Space>
      </DetailPageHeader>
      <PurchaseRequestChangeIncomeModal
        open={incomeOpen}
        confirmLoading={replacingIncome}
        initialContractId={request.income_contract_id}
        initialStageId={request.income_stage_id}
        onCancel={() => setIncomeOpen(false)}
        onConfirm={({ contractId, stageId, comment }) => {
          replaceIncome(
            {
              id: request.id,
              payload: {
                updated_at: request.updated_at,
                income_contract_id: contractId,
                income_stage_id: stageId,
                comment,
              },
            },
            {
              onSuccess: () => {
                setIncomeOpen(false);
                setTab(HISTORY_TAB);
                showNotification('success', 'Привязка обновлена');
              },
              onError: error => {
                if (axios.isAxiosError(error) && error.response?.status === 409) {
                  showNotification('error', 'Карточка изменена', 'Обновите данные и повторите сохранение');
                  return;
                }
                showNotification('error', 'Не удалось сменить договор', getApiErrorMessage(error) ?? 'Ошибка сохранения');
              },
            },
          );
        }}
      />
      <PurchaseRequestAssignLeadModal
        open={leadOpen}
        confirmLoading={assigningLead}
        initialEmployeeId={request.lead_manager_id}
        onCancel={() => setLeadOpen(false)}
        onConfirm={employeeId => {
          assignLead(
            {
              id: request.id,
              payload: { updated_at: request.updated_at, employee_id: employeeId },
            },
            {
              onSuccess: () => {
                setLeadOpen(false);
                setTab(ELABORATION_TAB);
                showNotification('success', 'Ведущий ОУП назначен');
              },
              onError: error => {
                if (axios.isAxiosError(error) && error.response?.status === 409) {
                  showNotification('error', 'Карточка изменена', 'Обновите данные и повторите назначение');
                  void refetch();
                  return;
                }
                if (axios.isAxiosError(error) && error.response?.status === 403) {
                  showNotification('error', 'Недостаточно прав', 'Назначить ведущего может только руководитель ОУП');
                  return;
                }
                showNotification('error', 'Не удалось назначить ведущего', getApiErrorMessage(error) ?? 'Ошибка');
              },
            },
          );
        }}
      />
    </>
  );
}
