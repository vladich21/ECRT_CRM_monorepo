import { useState } from 'react';
import { Alert, Button, Form, Input, Radio, Spin, Tag, Tooltip } from 'antd';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';

import type { PurchaseMethodOption } from '@/api/procurement/requests/procurementRequest.types';
import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';
import {
  useChoosePurchaseRequestRoute,
  usePurchaseRequestMethods,
  useSetPurchaseRequestMethod,
} from '@/api/procurement/requests/procurementRequestApiHooks';
import { formatMoneyAmount } from '@/helpers/numberFormatters';
import { getApiErrorMessage } from '@/hooks/modals/confirmDelete/getApiErrorMessage';
import { useNotification } from '@/hooks/notifications/useNotification';

import styles from './PurchaseRequestMethod.module.scss';

type Props = {
  request: PurchaseRequestDetail;
  canEdit: boolean;
  canRoute: boolean;
};

export function PurchaseRequestMethod({ request, canEdit, canRoute }: Props) {
  const { showNotification, contextHolder } = useNotification();
  const { data, isLoading, isError, refetch } = usePurchaseRequestMethods(request.id, request.status === 'agreed');
  const { mutateAsync: setMethod, isPending } = useSetPurchaseRequestMethod();
  const { mutateAsync: chooseRoute, isPending: routing } = useChoosePurchaseRequestRoute();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = `${location.pathname}${location.search}`;
  const methodSaved = Boolean(request.purchase_method_id);
  const [editing, setEditing] = useState(!methodSaved);
  const [form] = Form.useForm<{ method_id: string; method_justification?: string }>();
  const selectedId = Form.useWatch('method_id', form) as string | undefined;
  const selected = data?.methods.find(method => method.id === selectedId);

  const handleSave = async (values: { method_id: string; method_justification?: string }) => {
    try {
      await setMethod({
        id: request.id,
        payload: {
          updated_at: data?.request_updated_at ?? request.updated_at,
          method_id: values.method_id,
          method_justification: values.method_justification?.trim() || null,
        },
      });
      setEditing(false);
      showNotification('success', 'Способ закупки сохранён');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        showNotification('error', 'Карточка изменена', 'Обновите данные и повторите сохранение');
        void refetch();
        return;
      }
      showNotification('error', 'Не удалось сохранить способ', getApiErrorMessage(error) ?? 'Ошибка');
    }
  };

  const handleRoute = async () => {
    try {
      const detail = await chooseRoute({
        id: request.id,
        payload: {
          updated_at: request.updated_at,
          kind: 'contract',
        },
      });
      if (detail.routed_contract_id) {
        navigate(`/contracts/${detail.routed_contract_id}`, {
          state: { from: returnPath },
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        showNotification('error', 'Карточка изменена', 'Обновите данные и повторите');
        void refetch();
        return;
      }
      showNotification('error', 'Не удалось оформить', getApiErrorMessage(error) ?? 'Ошибка');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <Spin />
      </div>
    );
  }
  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Не удалось загрузить способы закупки'
        action={
          <Button size='small' onClick={() => void refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }
  if (!data) {
    return null;
  }

  return (
    <>
      {contextHolder}
      <div className={styles.wrap}>
        <section className={styles.card} aria-label='Способ закупки'>
          <div className={styles.amountBlock}>
            <span className={styles.amountLabel}>НМЦД</span>
            <span className={styles.amountValue}>{formatMoneyAmount(data.amount_net, data.currency_code)}</span>
            <span className={styles.amountHint}>
              без НДС
              {data.vat_percent && Number(data.vat_percent) > 0
                ? ` · ${formatMoneyAmount(data.amount_gross, data.currency_code)} с НДС ${data.vat_percent}%`
                : ''}
            </span>
          </div>

          <div className={styles.cardHead}>
            <h3 className={styles.title}>Способ закупки</h3>
            {canEdit && methodSaved ? (
              <Button type='link' size='small' onClick={() => setEditing(value => !value)}>
                {editing ? 'Свернуть' : 'Изменить'}
              </Button>
            ) : null}
          </div>

          {methodSaved && !editing ? (
            <ReadOnlyMethod request={request} methods={data.methods} justification={data.method_justification} />
          ) : null}

          {canEdit && editing ? (
            <Form
              form={form}
              layout='vertical'
              key={data.request_updated_at}
              initialValues={{
                method_id: data.selected_method_id ?? data.recommended_method_id ?? undefined,
                method_justification: data.method_justification ?? '',
              }}
              onFinish={values => void handleSave(values)}
            >
              <Form.Item name='method_id' rules={[{ required: true, message: 'Выберите способ закупки' }]}>
                <Radio.Group className={styles.methodList}>
                  {data.methods.map(method => (
                    <label
                      key={method.id}
                      className={`${styles.methodCard} ${selectedId === method.id ? styles.methodCardActive : ''} ${
                        !method.allowed ? styles.methodCardDisabled : ''
                      }`}
                    >
                      <Radio value={method.id} disabled={!method.allowed} />
                      <span className={styles.methodBody}>
                        <span className={styles.methodName}>
                          {method.name}
                          {method.id === data.recommended_method_id ? <Tag color='blue'>рекомендуется</Tag> : null}
                          {method.in_threshold ? <Tag color='success'>подходит</Tag> : null}
                          {!method.allowed ? (
                            <Tooltip title='Сумма выше верхнего порога: такая закупка проводится только через закупочную комиссию'>
                              <Tag>недоступен при этой сумме</Tag>
                            </Tooltip>
                          ) : null}
                          {method.allowed && method.requires_justification ? (
                            <Tag color='warning'>вне порога</Tag>
                          ) : null}
                        </span>
                        <span className={styles.bounds}>{formatThresholdBounds(method, data.currency_code)}</span>
                      </span>
                    </label>
                  ))}
                </Radio.Group>
              </Form.Item>
              {selected?.requires_justification ? (
                <>
                  <Alert type='info' showIcon message='Обоснование увидят согласующие отдельным пунктом' />
                  <Form.Item
                    name='method_justification'
                    label='Обоснование вне порога'
                    rules={[{ required: true, message: 'Укажите обоснование' }]}
                  >
                    <Input.TextArea rows={4} maxLength={2000} />
                  </Form.Item>
                </>
              ) : (
                <Form.Item name='method_justification' hidden>
                  <Input />
                </Form.Item>
              )}
              <div className={styles.actions}>
                <Button type='primary' htmlType='submit' loading={isPending}>
                  Сохранить
                </Button>
              </div>
            </Form>
          ) : null}
          {!canEdit && !methodSaved ? <p className={styles.bounds}>Способ ещё не выбран</p> : null}
        </section>
        <RouteCard
          request={request}
          canRoute={canRoute}
          routing={routing}
          returnPath={returnPath}
          onRoute={() => void handleRoute()}
        />
      </div>
    </>
  );
}

function ReadOnlyMethod({
  request,
  methods,
  justification,
}: {
  request: PurchaseRequestDetail;
  methods: PurchaseMethodOption[];
  justification: string | null;
}) {
  const current = methods.find(method => method.id === request.purchase_method_id);
  if (!current) {
    return <p className={styles.bounds}>Способ ещё не выбран</p>;
  }
  return (
    <div className={`${styles.methodCard} ${styles.methodCardActive}`}>
      <span className={styles.methodBody}>
        <span className={styles.methodName}>
          {current.name}
          {current.in_threshold ? <Tag color='success'>подходит</Tag> : <Tag color='warning'>вне порога</Tag>}
        </span>
        {justification ? <p className={styles.justification}>{justification}</p> : null}
      </span>
    </div>
  );
}

function RouteCard({
  request,
  canRoute,
  routing,
  returnPath,
  onRoute,
}: {
  request: PurchaseRequestDetail;
  canRoute: boolean;
  routing: boolean;
  returnPath: string;
  onRoute: () => void;
}) {
  const navigate = useNavigate();
  const methodSaved = Boolean(request.purchase_method_id);
  const contractId = request.routed_contract_id;

  return (
    <section className={styles.card} aria-label='Путь оформления'>
      <h3 className={styles.title}>Путь оформления</h3>
      {!methodSaved ? (
        <p className={styles.hint}>Сначала сохраните способ закупки — затем можно оформить расходный договор.</p>
      ) : contractId ? (
        <p className={styles.hint}>Расходный договор создан. Дальше работа идёт уже в карточке договора.</p>
      ) : (
        <p className={styles.hint}>По выбранному способу оформляется расходный договор.</p>
      )}
      {contractId ? (
        <Button
          type='primary'
          onClick={() =>
            navigate(`/contracts/${contractId}`, {
              state: { from: returnPath },
            })
          }
        >
          Открыть договор
        </Button>
      ) : (
        <Button type='primary' disabled={!canRoute || !methodSaved} loading={routing} onClick={onRoute}>
          Оформить договор
        </Button>
      )}
    </section>
  );
}

function formatThresholdBounds(method: PurchaseMethodOption, currency: string): string {
  const vat = method.vat_base === 'gross' ? 'с НДС' : 'без НДС';
  const from = method.amount_from ? formatMoneyAmount(method.amount_from, currency) : null;
  const to = method.amount_to ? formatMoneyAmount(method.amount_to, currency) : null;
  if (!from && to) return `до ${to} ${vat} включительно`;
  if (from && to) return `свыше ${from} до ${to} ${vat}`;
  if (from && !to) return `свыше ${from} ${vat}`;
  return vat;
}
