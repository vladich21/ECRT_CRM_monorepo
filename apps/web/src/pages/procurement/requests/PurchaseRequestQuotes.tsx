import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, Empty, Spin, Table } from 'antd';
import axios from 'axios';

import { fileApi } from '@/api/files/fileApi';
import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';
import { PURCHASE_QUOTE_ENTITY_TYPE } from '@/api/procurement/requests/procurementRequestApi';
import {
  useCreatePurchaseQuote,
  usePurchaseRequestQuotes,
  usePurchaseRequestSuppliers,
  usePurchaseRequestVatRates,
  useUpdatePurchaseQuote,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import type { PurchaseQuoteRow } from '@/api/procurement/requests/procurementRequest.types';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';

import {
  PurchaseRequestQuoteModal,
  quoteDatesFromForm,
  toQuotePaymentPayload,
  type QuoteFormValues,
} from './PurchaseRequestQuoteModal';
import { paymentTermsShareComplete } from './purchaseQuotePayment';
import { purchaseRequestQuoteColumns } from './PurchaseRequestQuotesColumns';
import styles from './PurchaseRequestQuotes.module.scss';

type Props = {
  request: PurchaseRequestDetail;
  canEdit: boolean;
};

export function PurchaseRequestQuotes({ request, canEdit }: Props) {
  const { showNotification, contextHolder } = useNotification();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseQuoteRow | null>(null);

  const { data: quotes = [], isLoading, isError, refetch } = usePurchaseRequestQuotes(request.id);
  const { data: suppliers = [] } = usePurchaseRequestSuppliers(request.id);
  const { data: vatRates = [] } = usePurchaseRequestVatRates(canEdit || modalOpen);
  const { mutateAsync: createQuote, isPending: creating } = useCreatePurchaseQuote();
  const { mutateAsync: updateQuote, isPending: updating } = useUpdatePurchaseQuote();

  const quotedPartnerIds = useMemo(() => new Set(quotes.map(row => row.partner_id)), [quotes]);
  const canAdd = canEdit && suppliers.some(row => !quotedPartnerIds.has(row.partner_id));

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = useCallback((row: PurchaseQuoteRow) => {
    setEditing(row);
    setModalOpen(true);
  }, []);

  const columns = useMemo(
    () => purchaseRequestQuoteColumns({ canEdit, onEdit: openEdit }),
    [canEdit, openEdit],
  );

  const uploadQuoteFile = async (quoteId: string, file: File) => {
    const formData = new FormData();
    formData.append('file1', file);
    formData.append('entityType', PURCHASE_QUOTE_ENTITY_TYPE);
    formData.append('entityId', quoteId);
    await fileApi.uploadFiles(formData);
  };

  const handleSubmit = async ({ values, file }: { values: QuoteFormValues; file: File | null }) => {
    const dates = quoteDatesFromForm(values);
    const payment_terms = toQuotePaymentPayload(values);
    if (values.price == null) {
      showNotification('error', 'Укажите цену');
      return;
    }
    if (!paymentTermsShareComplete(payment_terms.map(line => line.share))) {
      showNotification('error', 'Сумма долей оплаты должна быть 100%');
      return;
    }
    try {
      if (editing) {
        const saved = await updateQuote({
          quoteId: editing.id,
          payload: {
            updated_at: editing.updated_at,
            quote_number: values.quote_number?.trim() || null,
            ...dates,
            price: values.price,
            vat_rate_id: values.vat_rate_id,
            delivery_days: values.delivery_days ?? null,
            warranty_months: values.warranty_months ?? null,
            contact_name: values.contact_name?.trim() || null,
            comment: values.comment?.trim() || null,
            payment_terms,
          },
        });
        if (file) {
          try {
            await uploadQuoteFile(saved.id, file);
            await refetch();
          } catch {
            showNotification('warning', 'КП сохранено', 'Файл не загрузился — приложите его еще раз');
            setModalOpen(false);
            setEditing(null);
            return;
          }
        }
        showNotification('success', 'КП обновлено');
      } else {
        const saved = await createQuote({
          id: request.id,
          payload: {
            updated_at: request.updated_at,
            partner_id: values.partner_id,
            quote_number: values.quote_number?.trim() || null,
            ...dates,
            price: values.price,
            vat_rate_id: values.vat_rate_id,
            delivery_days: values.delivery_days ?? null,
            warranty_months: values.warranty_months ?? null,
            contact_name: values.contact_name?.trim() || null,
            comment: values.comment?.trim() || null,
            payment_terms,
          },
        });
        if (file) {
          try {
            await uploadQuoteFile(saved.id, file);
            await refetch();
          } catch {
            showNotification('warning', 'КП сохранено', 'Файл не загрузился — откройте КП и приложите еще раз');
            setModalOpen(false);
            setEditing(null);
            return;
          }
        }
        showNotification('success', 'КП добавлено');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const message = getApiErrorMessage(error) ?? '';
        if (message.includes('уже есть КП')) {
          showNotification('info', 'По этому поставщику уже есть КП');
          return;
        }
        showNotification('error', 'Данные изменились', 'Обновите карточку и повторите');
        return;
      }
      showNotification('error', 'Не удалось сохранить КП', getApiErrorMessage(error) ?? 'Ошибка');
    }
  };

  return (
    <>
      {contextHolder}
      <section className={styles.section} aria-label='Коммерческие предложения'>
        {canAdd ? (
          <div className={styles.head}>
            <Button type='primary' onClick={openCreate}>
              Добавить коммерческое предложение
            </Button>
          </div>
        ) : null}
        {canEdit && suppliers.length === 0 ? (
          <Alert type='info' showIcon message='Сначала добавьте поставщика — коммерческое предложение привязывается к нему.' />
        ) : null}
        {canEdit && suppliers.length > 0 && !canAdd ? (
          <Alert type='info' showIcon message='У каждого поставщика уже есть коммерческое предложение.' />
        ) : null}

        {isLoading ? (
          <Spin />
        ) : isError ? (
          <Alert
            type='error'
            showIcon
            message='Не удалось загрузить коммерческие предложения'
            action={
              <Button size='small' onClick={() => void refetch()}>
                Повторить
              </Button>
            }
          />
        ) : quotes.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Коммерческих предложений пока нет' />
        ) : (
          <Table
            size='small'
            rowKey='id'
            pagination={false}
            columns={columns}
            dataSource={quotes}
            scroll={{ x: 'max-content' }}
          />
        )}
      </section>
      {modalOpen ? (
        <PurchaseRequestQuoteModal
          open={modalOpen}
          editing={editing}
          suppliers={suppliers}
          quotedPartnerIds={quotedPartnerIds}
          vatRates={vatRates}
          saving={creating || updating}
          onCancel={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSubmit={values => void handleSubmit(values)}
        />
      ) : null}
    </>
  );
}
