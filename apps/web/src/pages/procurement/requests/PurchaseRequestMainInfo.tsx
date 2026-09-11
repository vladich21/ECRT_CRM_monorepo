import type { ReactNode } from 'react';
import { CalendarOutlined, ProjectOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';

import type { PurchaseRequestDetail } from '@/api/procurement/requests/procurementRequestApi';

import styles from './PurchaseRequestMainInfo.module.scss';
import {
  FUNDING_SOURCE_LABELS,
  formatPurchaseRequestAmount,
  formatPurchaseRequestDate,
} from './purchaseRequestLabels';

const { Text } = Typography;

type Props = {
  request: PurchaseRequestDetail;
};

function FieldCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.fieldCell}>
      <span className={styles.fieldLabel}>{label}</span>
      <span className={styles.fieldValue}>{children}</span>
    </div>
  );
}

function TextValue({ value }: { value: string | null | undefined }) {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : <Text type='secondary'>Не указано</Text>;
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.metaRow}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{children}</span>
    </div>
  );
}

export function PurchaseRequestMainInfo({ request }: Props) {
  const funding =
    FUNDING_SOURCE_LABELS[request.funding_source as keyof typeof FUNDING_SOURCE_LABELS] ?? request.funding_source;

  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <section className={styles.card} aria-labelledby='purchase-request-what'>
          <h3 id='purchase-request-what' className={styles.sectionTitle}>
            <ShoppingOutlined className={styles.sectionTitleIcon} aria-hidden />
            Что закупаем
          </h3>
          <p className={styles.subject}>{request.subject}</p>
          <div className={styles.justificationBlock}>
            <span className={styles.justificationLabel}>Обоснование</span>
            <p className={styles.justification}>{request.justification || 'Не указано'}</p>
          </div>
        </section>

        <section className={styles.card} aria-labelledby='purchase-request-project'>
          <h3 id='purchase-request-project' className={styles.sectionTitle}>
            <ProjectOutlined className={styles.sectionTitleIcon} aria-hidden />
            Проект и ответственные
          </h3>
          <div className={styles.fieldsGrid}>
            <FieldCell label='Проект'>
              <TextValue value={request.project_name} />
            </FieldCell>
            <FieldCell label='Подразделение'>
              <TextValue value={request.department_name} />
            </FieldCell>
            <FieldCell label='Источник финансирования'>
              <TextValue value={funding} />
            </FieldCell>
            <FieldCell label='Инициатор'>
              <TextValue value={request.initiator_name} />
            </FieldCell>
            <FieldCell label='Ведущий ОУП'>
              {request.lead_manager_name?.trim() ? (
                request.lead_manager_name
              ) : (
                <Text type='secondary'>Не назначен</Text>
              )}
            </FieldCell>
            <FieldCell label='Технический приемщик'>
              <TextValue value={request.tech_acceptor_name} />
            </FieldCell>
            {request.funding_source === 'income_contract' ? (
              <>
                <FieldCell label='Доходный договор'>
                  {request.income_contract_id ? (
                    <Link
                      to={`/contracts/${request.income_contract_id}`}
                      state={{ from: `/procurement/requests/${request.id}` }}
                      className={styles.contractLink}
                    >
                      {request.income_contract_name?.trim() || 'Открыть договор'}
                    </Link>
                  ) : (
                    <Text type='secondary'>Не указано</Text>
                  )}
                </FieldCell>
                <FieldCell label='Этап'>
                  <TextValue value={request.income_stage_name} />
                </FieldCell>
              </>
            ) : null}
          </div>
        </section>
      </div>

      <aside className={styles.aside}>
        <section className={styles.card} aria-labelledby='purchase-request-term'>
          <h3 id='purchase-request-term' className={styles.sectionTitle}>
            <CalendarOutlined className={styles.sectionTitleIcon} aria-hidden />
            Срок и сумма
          </h3>
          <div className={styles.amountBlock}>
            <span className={styles.amountLabel}>Сумма</span>
            <span className={styles.amountValue}>
              {formatPurchaseRequestAmount(request.amount, request.currency_code)}
            </span>
          </div>
          <div className={styles.metaList}>
            <MetaRow label='Дата запроса'>{formatPurchaseRequestDate(request.request_date)}</MetaRow>
            <MetaRow label='Срок поставки'>{formatPurchaseRequestDate(request.required_date)}</MetaRow>
            <MetaRow label='Приоритет'>
              {request.is_urgent ? <Tag color='error'>Срочно</Tag> : 'Обычный'}
            </MetaRow>
          </div>
        </section>
      </aside>
    </div>
  );
}
