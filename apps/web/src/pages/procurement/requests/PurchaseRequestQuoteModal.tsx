import { useEffect, useMemo, useState } from 'react';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select, Typography, Upload } from 'antd';
import type { FormInstance } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import type {
  PurchaseQuotePaymentTermPayload,
  PurchaseQuoteRow,
  PurchaseRequestSupplierRow,
  QuoteDayKind,
  QuotePaymentType,
  VatRateOption,
} from '@/api/procurement/requests/procurementRequest.types';
import { MONEY_NUMERIC_MAX, SHARE_TOTAL_CENTS } from '@/api/procurement/requests/procurementRequest.types';
import { MONEY_INPUT_NUMBER_PROPS } from '@/helpers/numberFormatters';

import {
  EMPTY_QUOTE_PAYMENT_LINE,
  QUOTE_DAY_KIND_LABELS,
  QUOTE_PAYMENT_TYPE_LABELS,
  paymentTermsShareCents,
  paymentTermsShareComplete,
} from './purchaseQuotePayment';
import styles from './PurchaseRequestQuotes.module.scss';

export type QuoteFormValues = {
  partner_id: string;
  quote_number?: string;
  quote_date?: Dayjs | null;
  valid_until?: Dayjs | null;
  price?: number;
  vat_rate_id: string;
  delivery_days?: number | null;
  warranty_months?: number | null;
  contact_name?: string;
  comment?: string;
  payment_terms: Array<{
    share: number;
    payment_type: QuotePaymentType;
    days?: number | null;
    day_kind?: QuoteDayKind | null;
  }>;
};

type Props = {
  open: boolean;
  editing: PurchaseQuoteRow | null;
  suppliers: PurchaseRequestSupplierRow[];
  quotedPartnerIds: Set<string>;
  vatRates: VatRateOption[];
  saving: boolean;
  onCancel: () => void;
  onSubmit: (payload: {
    values: QuoteFormValues;
    file: File | null;
  }) => void;
};

const PAYMENT_TYPE_OPTIONS = Object.entries(QUOTE_PAYMENT_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));
const DAY_KIND_OPTIONS = Object.entries(QUOTE_DAY_KIND_LABELS).map(([value, label]) => ({
  value,
  label: `${label} дней`,
}));

function isoOrNull(value: Dayjs | null | undefined): string | null {
  return value ? value.format('YYYY-MM-DD') : null;
}

export function toQuotePaymentPayload(values: QuoteFormValues): PurchaseQuotePaymentTermPayload[] {
  return values.payment_terms.map(line =>
    line.payment_type === 'advance'
      ? { share: line.share, payment_type: 'advance' }
      : {
          share: line.share,
          payment_type: 'payment',
          days: line.days ?? null,
          day_kind: line.day_kind ?? null,
        },
  );
}

export function quoteDatesFromForm(values: QuoteFormValues) {
  return {
    quote_date: isoOrNull(values.quote_date),
    valid_until: isoOrNull(values.valid_until),
  };
}

function defaultVatId(vatRates: VatRateOption[]): string | undefined {
  return vatRates.find(rate => rate.code === '22' || rate.rate === '22.00' || rate.rate === '22')?.id ?? vatRates[0]?.id;
}

export function PurchaseRequestQuoteModal({
  open,
  editing,
  suppliers,
  quotedPartnerIds,
  vatRates,
  saving,
  onCancel,
  onSubmit,
}: Props) {
  const [form] = Form.useForm<QuoteFormValues>();
  const [file, setFile] = useState<File | null>(null);
  const partnerOptions = useMemo(() => {
    return suppliers
      .filter(row => !quotedPartnerIds.has(row.partner_id) || row.partner_id === editing?.partner_id)
      .map(row => ({ value: row.partner_id, label: row.name || 'Поставщик' }));
  }, [editing?.partner_id, quotedPartnerIds, suppliers]);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    if (editing) {
      form.setFieldsValue({
        partner_id: editing.partner_id,
        quote_number: editing.quote_number ?? undefined,
        quote_date: editing.quote_date ? dayjs(editing.quote_date) : null,
        valid_until: editing.valid_until ? dayjs(editing.valid_until) : null,
        price: Number(editing.price),
        vat_rate_id: editing.vat_rate_id ?? defaultVatId(vatRates),
        delivery_days: editing.delivery_days,
        warranty_months: editing.warranty_months,
        contact_name: editing.contact_name ?? undefined,
        comment: editing.comment ?? undefined,
        payment_terms:
          editing.payment_terms.length > 0
            ? editing.payment_terms.map(term => ({
                share: Number(term.share),
                payment_type: term.payment_type as QuotePaymentType,
                days: term.days,
                day_kind: (term.day_kind as QuoteDayKind | null) ?? null,
              }))
            : [{ ...EMPTY_QUOTE_PAYMENT_LINE }],
      });
      return;
    }
    form.setFieldsValue({
      partner_id: partnerOptions[0]?.value,
      quote_number: undefined,
      quote_date: null,
      valid_until: null,
      price: undefined,
      vat_rate_id: defaultVatId(vatRates),
      delivery_days: undefined,
      warranty_months: undefined,
      contact_name: undefined,
      comment: undefined,
      payment_terms: [{ ...EMPTY_QUOTE_PAYMENT_LINE }],
    });
  }, [editing, form, open, partnerOptions, vatRates]);

  return (
    <Modal
      title={editing ? 'Изменить КП' : 'Новое КП'}
      open={open}
      onCancel={onCancel}
      onOk={() => void form.submit()}
      confirmLoading={saving}
      destroyOnClose
      width={760}
      okText='Сохранить'
    >
      <Form<QuoteFormValues>
        form={form}
        layout='vertical'
        className={styles.form}
        onFinish={values => onSubmit({ values, file })}
        onValuesChange={changed => {
          if (!changed.payment_terms) return;
          const terms: QuoteFormValues['payment_terms'] = form.getFieldValue('payment_terms') ?? [];
          terms.forEach((term, index) => {
            if (term?.payment_type === 'advance' && (term.days != null || term.day_kind)) {
              form.setFieldValue(['payment_terms', index, 'days'], null);
              form.setFieldValue(['payment_terms', index, 'day_kind'], null);
            }
          });
        }}
      >
        <Row gutter={[10, 0]}>
          <Col span={16}>
            <Form.Item name='partner_id' label='Поставщик' rules={[{ required: true, message: 'Выберите поставщика' }]}>
              <Select options={partnerOptions} disabled={Boolean(editing)} placeholder='Из запроса' />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name='quote_number' label='Номер'>
              <Input maxLength={60} />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name='quote_date' label='Дата КП'>
              <DatePicker format='DD.MM.YYYY' placeholder='ДД.ММ.ГГГГ' />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item name='valid_until' label='До'>
              <DatePicker format='DD.MM.YYYY' placeholder='ДД.ММ.ГГГГ' />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='vat_rate_id' label='НДС' rules={[{ required: true, message: 'Ставка' }]}>
              <Select options={vatRates.map(rate => ({ value: rate.id, label: rate.name }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='price' label='Цена' rules={[{ required: true, message: 'Укажите цену' }]}>
              <InputNumber {...MONEY_INPUT_NUMBER_PROPS} max={MONEY_NUMERIC_MAX} min={0.01} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='delivery_days' label='Поставка, дн.'>
              <InputNumber min={0} max={3650} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name='warranty_months' label='Гарантия, мес.'>
              <InputNumber min={0} max={1200} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item name='contact_name' label='Контакт'>
              <Input maxLength={200} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label={editing ? 'Ещё файл' : 'Файл КП'}>
              {editing && editing.files.length > 0 ? (
                <div className={styles.files}>
                  {editing.files.map(fileRow => (
                    <Typography.Text key={fileRow.id} type='secondary' ellipsis>
                      {fileRow.name}
                    </Typography.Text>
                  ))}
                </div>
              ) : null}
              <Upload
                maxCount={1}
                beforeUpload={next => {
                  setFile(next);
                  return false;
                }}
                onRemove={() => {
                  setFile(null);
                }}
              >
                <Button size='small'>Выбрать</Button>
              </Upload>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='comment' label='Комментарий'>
              <Input.TextArea maxLength={2000} rows={1} />
            </Form.Item>
          </Col>
        </Row>
        <div className={styles.payHead}>
          <span className={styles.payTitle}>Оплата</span>
          <ShareHint form={form} />
        </div>
        <Form.List name='payment_terms'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <PaymentTermRow
                  key={key}
                  name={name}
                  restField={restField}
                  canRemove={fields.length > 1}
                  onRemove={() => remove(name)}
                />
              ))}
              <Button
                className={styles.addTerm}
                type='dashed'
                size='small'
                icon={<PlusOutlined />}
                onClick={() => {
                  const terms: QuoteFormValues['payment_terms'] = form.getFieldValue('payment_terms') ?? [];
                  const leftover = (SHARE_TOTAL_CENTS - paymentTermsShareCents(terms.map(line => line?.share))) / 100;
                  add({
                    share: leftover > 0 ? leftover : undefined,
                    payment_type: 'payment',
                    days: 10,
                    day_kind: 'calendar',
                  });
                }}
              >
                Строка оплаты
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  );
}

function ShareHint({ form }: { form: FormInstance<QuoteFormValues> }) {
  const terms = Form.useWatch('payment_terms', form) ?? [];
  const cents = paymentTermsShareCents(terms.map(line => line?.share));
  const ok = paymentTermsShareComplete(terms.map(line => line?.share));
  return (
    <p className={`${styles.shareHint} ${ok ? '' : styles.shareError}`}>
      Сумма долей: {(cents / 100).toFixed(2)}% {ok ? '' : '(нужно 100%)'}
    </p>
  );
}

function PaymentTermRow({
  name,
  restField,
  canRemove,
  onRemove,
}: {
  name: number;
  restField: object;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const type = Form.useWatch(['payment_terms', name, 'payment_type']);
  const isAdvance = type === 'advance';
  return (
    <div className={styles.termRow}>
      <Form.Item
        {...restField}
        name={[name, 'share']}
        className={styles.termShare}
        rules={[{ required: true, message: 'Доля' }]}
      >
        <InputNumber min={0.01} max={100} step={1} addonAfter='%' />
      </Form.Item>
      <Form.Item
        {...restField}
        name={[name, 'payment_type']}
        className={styles.termType}
        rules={[{ required: true, message: 'Тип' }]}
      >
        <Select options={PAYMENT_TYPE_OPTIONS} />
      </Form.Item>
      {isAdvance ? null : (
        <>
          <Form.Item
            {...restField}
            name={[name, 'days']}
            className={styles.termDays}
            rules={[{ required: true, message: 'Дни' }]}
          >
            <InputNumber min={1} max={3650} placeholder='Дни' />
          </Form.Item>
          <Form.Item
            {...restField}
            name={[name, 'day_kind']}
            className={styles.termKind}
            rules={[{ required: true, message: 'Тип дней' }]}
          >
            <Select options={DAY_KIND_OPTIONS} placeholder='Тип дней' />
          </Form.Item>
        </>
      )}
      {canRemove ? (
        <Button
          className={styles.termRemove}
          type='text'
          icon={<DeleteOutlined />}
          onClick={onRemove}
          aria-label='Удалить строку'
        />
      ) : null}
    </div>
  );
}
