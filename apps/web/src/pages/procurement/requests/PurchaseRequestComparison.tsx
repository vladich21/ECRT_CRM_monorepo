import { useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Empty, Form, Input, InputNumber, Select, Spin, Table, Tag } from 'antd';
import axios from 'axios';

import type {
  PurchaseRequestComparison as ComparisonData,
  PriceMethod,
} from '@/api/procurement/requests/procurementRequest.types';
import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';
import {
  useFixPurchaseRequestPrice,
  usePurchaseRequestComparison,
  usePurchaseRequestSelectionReasons,
  useSelectPurchaseRequestSupplier,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { formatMoneyAmount, MONEY_INPUT_NUMBER_PROPS } from '@/helpers/numberFormatters';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';

import styles from './PurchaseRequestComparison.module.scss';
import { purchaseRequestComparisonColumns } from './PurchaseRequestComparisonColumns';
import { buildComparisonTableRows, marketPreviewMessage } from './purchaseRequestComparisonTable';
import { PRICE_METHOD_OPTIONS, priceMethodLabel } from './purchaseRequestLabels';

type Props = {
  request: PurchaseRequestDetail;
  canEdit: boolean;
  pane: 'compare' | 'decision';
};

export function PurchaseRequestComparison({ request, canEdit, pane }: Props) {
  const { showNotification, contextHolder } = useNotification();
  const { data, isLoading, isError, refetch } = usePurchaseRequestComparison(request.id);
  const { data: reasons = [] } = usePurchaseRequestSelectionReasons();
  const { mutateAsync: fixPrice, isPending: fixing } = useFixPurchaseRequestPrice();
  const { mutateAsync: selectSupplier, isPending: selecting } = useSelectPurchaseRequestSupplier();

  const outlierIds = useMemo(
    () => new Set((data?.market_preview.excluded ?? []).map(row => row.quote_id)),
    [data?.market_preview.excluded],
  );
  const rows = useMemo(() => (data ? buildComparisonTableRows(data.quotes, data.currency_code) : []), [data]);
  const columns = useMemo(
    () =>
      data
        ? purchaseRequestComparisonColumns({
            quotes: data.quotes,
            best: data.best,
            outlierIds,
          })
        : [],
    [data, outlierIds],
  );

  const expiring = data?.quotes.filter(quote => quote.is_expiring) ?? [];
  const updatedAt = data?.request_updated_at ?? request.updated_at;

  const handleFix = async (values: { method: PriceMethod; amount?: number | null; note?: string }) => {
    try {
      await fixPrice({
        id: request.id,
        payload: {
          updated_at: updatedAt,
          method: values.method,
          amount: values.method === 'market' || values.method === 'impossible' ? null : values.amount,
          note: values.note?.trim() || null,
        },
      });
      showNotification('success', 'НМЦД зафиксирована');
    } catch (error) {
      notifyLockOrError(showNotification, error, 'Не удалось зафиксировать НМЦД');
    }
  };

  const handleSelect = async (values: { quote_id: string; reason_codes: string[]; note?: string }) => {
    try {
      await selectSupplier({
        id: request.id,
        payload: {
          updated_at: updatedAt,
          quote_id: values.quote_id,
          reason_codes: values.reason_codes,
          note: values.note?.trim() || null,
        },
      });
      showNotification('success', 'Поставщик выбран');
    } catch (error) {
      notifyLockOrError(showNotification, error, 'Не удалось выбрать поставщика');
    }
  };

  const emptyQuotes = !data || data.quotes.length === 0;

  return (
    <>
      {contextHolder}
      {pane === 'compare' ? (
        <section className={styles.section} aria-label='Сравнение коммерческих предложений'>
          <div className={styles.head}>
            <h3 className={styles.blockTitle}>Сравнение</h3>
            {data?.expert_price ? (
              <p className={styles.hint}>
                База отклонения — экспертная цена {formatMoneyAmount(data.expert_price, data.currency_code)}
              </p>
            ) : (
              <p className={styles.hint}>Экспертная цена не задана — отклонение не считается</p>
            )}
          </div>

          {expiring.length > 0 ? (
            <Alert
              type='warning'
              showIcon
              message='Срок действия коммерческого предложения меньше 5 рабочих дней'
              description={expiring.map(quote => quote.partner_name).join(', ')}
            />
          ) : null}

          {isLoading ? (
            <Spin />
          ) : isError ? (
            <Alert
              type='error'
              showIcon
              message='Не удалось загрузить сравнение'
              action={
                <Button size='small' onClick={() => void refetch()}>
                  Повторить
                </Button>
              }
            />
          ) : emptyQuotes ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Сначала добавьте коммерческие предложения — здесь появится сравнение'
            />
          ) : (
            <Table
              size='middle'
              rowKey='key'
              pagination={false}
              columns={columns}
              dataSource={rows}
              scroll={{ x: 'max-content' }}
            />
          )}
        </section>
      ) : (
        <section className={styles.section} aria-label='НМЦД и выбор поставщика'>
          {isLoading ? (
            <Spin />
          ) : isError ? (
            <Alert
              type='error'
              showIcon
              message='Не удалось загрузить данные для НМЦД'
              action={
                <Button size='small' onClick={() => void refetch()}>
                  Повторить
                </Button>
              }
            />
          ) : emptyQuotes ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Сначала заведите коммерческие предложения — затем фиксируйте НМЦД и выбирайте поставщика'
            />
          ) : data ? (
            <div className={styles.stack}>
              <NmcdCard
                key={`nmcd-${data.request_updated_at}`}
                canEdit={canEdit}
                comparison={data}
                saving={fixing}
                onSubmit={handleFix}
              />
              <SelectSupplierCard
                key={`pick-${data.request_updated_at}`}
                canEdit={canEdit}
                comparison={data}
                reasons={reasons}
                saving={selecting}
                onSubmit={handleSelect}
              />
            </div>
          ) : null}
        </section>
      )}
    </>
  );
}

function NmcdCard(props: {
  canEdit: boolean;
  comparison: ComparisonData;
  saving: boolean;
  onSubmit: (values: { method: PriceMethod; amount?: number | null; note?: string }) => Promise<void>;
}) {
  const { comparison, canEdit } = props;
  const [form] = Form.useForm();
  const fixed = Boolean(comparison.price_method);
  const [editing, setEditing] = useState(!fixed);
  const watched = Form.useWatch('method', form) as PriceMethod | undefined;
  const method = watched ?? (comparison.price_method as PriceMethod | null) ?? 'market';
  const marketMessage = method === 'market' ? marketPreviewMessage(comparison.market_preview.code) : null;
  const marketBlocked = method === 'market' && !comparison.market_preview.ok;

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.headMain}>
          <h3 className={styles.cardTitle}>НМЦД</h3>
          {fixed ? <Tag className={styles.methodTag}>{priceMethodLabel(comparison.price_method)}</Tag> : null}
        </div>
        <div className={styles.headExtra}>
          {canEdit && fixed ? (
            <Button type='link' size='small' onClick={() => setEditing(value => !value)}>
              {editing ? 'Свернуть' : 'Изменить'}
            </Button>
          ) : null}
        </div>
      </div>
      {comparison.price_method ? (
        <div className={styles.fact}>
          <span className={styles.factValue}>
            {comparison.initial_max_price
              ? formatMoneyAmount(comparison.initial_max_price, comparison.currency_code)
              : 'Цена не обоснована'}
          </span>
          {comparison.price_method === 'impossible' ? null : (
            <span className={styles.factMeta}>
              {comparison.nmcd_snapshot?.excluded.length
                ? `Исключено КП из расчёта: ${comparison.nmcd_snapshot.excluded.length}`
                : 'Все КП учтены в расчёте'}
            </span>
          )}
          {comparison.price_method_note ? <p className={styles.note}>{comparison.price_method_note}</p> : null}
        </div>
      ) : (
        <p className={styles.emptyLine}>Ещё не зафиксирована</p>
      )}
      {canEdit && editing && method === 'market' && comparison.market_preview.ok ? (
        <p className={styles.hint}>
          Среднее без НДС после выбросов:{' '}
          {formatMoneyAmount(comparison.market_preview.average_after, comparison.currency_code)}
        </p>
      ) : null}
      {canEdit && editing && marketMessage ? <Alert type='warning' showIcon message={marketMessage} /> : null}
      {canEdit && editing ? (
        <Form
          form={form}
          layout='vertical'
          key={comparison.request_updated_at}
          initialValues={{
            method: (comparison.price_method as PriceMethod | null) ?? 'market',
            amount: comparison.initial_max_price != null ? Number(comparison.initial_max_price) : undefined,
            note: comparison.price_method_note ?? '',
          }}
          onFinish={values => void props.onSubmit(values)}
        >
          <div className={styles.formRow}>
            <Form.Item name='method' label='Метод' rules={[{ required: true }]}>
              <Select options={PRICE_METHOD_OPTIONS} />
            </Form.Item>
            {method !== 'market' && method !== 'impossible' ? (
              <Form.Item name='amount' label='Сумма НМЦД' rules={[{ required: true, message: 'Укажите сумму НМЦД' }]}>
                <InputNumber {...MONEY_INPUT_NUMBER_PROPS} />
              </Form.Item>
            ) : null}
          </div>
          <Form.Item
            name='note'
            label={method === 'impossible' ? 'Пояснение' : 'Комментарий'}
            rules={method === 'impossible' ? [{ required: true, message: 'Укажите пояснение' }] : undefined}
          >
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
          <div className={styles.actions}>
            <Button type='primary' htmlType='submit' loading={props.saving} disabled={marketBlocked}>
              {fixed ? 'Сохранить' : 'Зафиксировать'}
            </Button>
          </div>
        </Form>
      ) : null}
    </div>
  );
}

function SelectSupplierCard(props: {
  canEdit: boolean;
  comparison: ComparisonData;
  reasons: { code: string; name: string }[];
  saving: boolean;
  onSubmit: (values: { quote_id: string; reason_codes: string[]; note?: string }) => Promise<void>;
}) {
  const { comparison, canEdit, reasons } = props;
  const selected = comparison.quotes.find(quote => quote.quote_id === comparison.selected_quote_id);
  const reasonNames = comparison.reason_codes
    .map(code => reasons.find(reason => reason.code === code)?.name ?? code)
    .filter(Boolean);
  const picked = Boolean(selected);
  const [editing, setEditing] = useState(!picked);

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.headMain}>
          <h3 className={styles.cardTitle}>Выбор поставщика</h3>
          {reasonNames.length > 0 ? (
            <div className={styles.reasonTags}>
              {reasonNames.map(name => (
                <Tag key={name} className={styles.reasonTag}>
                  {name}
                </Tag>
              ))}
            </div>
          ) : null}
        </div>
        <div className={styles.headExtra}>
          {canEdit && picked ? (
            <Button type='link' size='small' onClick={() => setEditing(value => !value)}>
              {editing ? 'Свернуть' : 'Изменить'}
            </Button>
          ) : null}
        </div>
      </div>
      {selected ? (
        <div className={styles.fact}>
          <div className={styles.factTop}>
            <span className={styles.factValue}>{selected.partner_name}</span>
            <dl className={styles.params}>
              <div className={styles.param}>
                <dt className={styles.paramLabel}>Цена</dt>
                <dd className={styles.paramValue}>{formatMoneyAmount(selected.price, comparison.currency_code)}</dd>
              </div>
              {selected.delivery_days != null ? (
                <div className={styles.param}>
                  <dt className={styles.paramLabel}>Срок поставки</dt>
                  <dd className={styles.paramValue}>{selected.delivery_days}&nbsp;дн.</dd>
                </div>
              ) : null}
              {selected.warranty_months != null ? (
                <div className={styles.param}>
                  <dt className={styles.paramLabel}>Гарантия</dt>
                  <dd className={styles.paramValue}>{selected.warranty_months}&nbsp;мес.</dd>
                </div>
              ) : null}
            </dl>
          </div>
          {comparison.selection_note ? <p className={styles.note}>{comparison.selection_note}</p> : null}
        </div>
      ) : (
        <p className={styles.emptyLine}>Ещё не выбран</p>
      )}
      {canEdit && editing ? (
        <Form
          layout='vertical'
          key={`${comparison.request_updated_at}-${comparison.selected_quote_id ?? ''}`}
          initialValues={{
            quote_id: comparison.selected_quote_id ?? undefined,
            reason_codes: comparison.reason_codes,
            note: comparison.selection_note ?? '',
          }}
          onFinish={values => void props.onSubmit(values)}
        >
          <Form.Item name='quote_id' label='КП' rules={[{ required: true, message: 'Выберите КП' }]}>
            <Select
              options={comparison.quotes.map(quote => ({
                value: quote.quote_id,
                label: `${quote.partner_name} · ${formatMoneyAmount(quote.price, comparison.currency_code)}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name='reason_codes'
            label='Причины'
            rules={[{ required: true, type: 'array', min: 1, message: 'Укажите хотя бы одну причину' }]}
          >
            <Checkbox.Group options={reasons.map(reason => ({ label: reason.name, value: reason.code }))} />
          </Form.Item>
          <Form.Item name='note' label='Комментарий'>
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
          <div className={styles.actions}>
            <Button type='primary' htmlType='submit' loading={props.saving}>
              {picked ? 'Сохранить' : 'Выбрать'}
            </Button>
          </div>
        </Form>
      ) : null}
    </div>
  );
}

function notifyLockOrError(
  showNotification: (type: 'success' | 'info' | 'warning' | 'error', title: string, description?: string) => void,
  error: unknown,
  title: string,
) {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    showNotification('error', 'Данные изменились', 'Обновите карточку и повторите');
    return;
  }
  showNotification('error', title, getApiErrorMessage(error) ?? 'Ошибка');
}
