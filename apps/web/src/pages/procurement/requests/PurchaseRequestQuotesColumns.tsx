import { Button, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { PurchaseQuoteRow } from '@/api/procurement/requests/procurementRequest.types';
import { triggerFileDownload } from '@/components/filePreview/FilePreviewModal';
import { formatMoneyAmount } from '@/helpers/numberFormatters';

import { formatQuotePaymentTermLines } from './purchaseQuotePayment';
import { formatPurchaseRequestDate } from './purchaseRequestLabels';
import { PurchaseRequestPartnerLink } from './PurchaseRequestPartnerLink';
import styles from './PurchaseRequestQuotes.module.scss';

function renderPartner(name: string, row: PurchaseQuoteRow) {
  return (
    <>
      <PurchaseRequestPartnerLink partnerId={row.partner_id}>{name || 'Поставщик'}</PurchaseRequestPartnerLink>
      {row.excluded_from_nmcd ? (
        <>
          {' '}
          <Tag color='warning'>вне НМЦД</Tag>
        </>
      ) : null}
    </>
  );
}

function renderPrice(_value: unknown, row: PurchaseQuoteRow) {
  return formatMoneyAmount(row.price, row.currency_code);
}

function renderVat(_value: unknown, row: PurchaseQuoteRow) {
  return row.vat_rate_name || (row.vat_percent != null ? `${row.vat_percent}%` : '—');
}

function renderTerms(_value: unknown, row: PurchaseQuoteRow) {
  const lines = formatQuotePaymentTermLines(row.payment_terms);
  if (lines.length === 0) return '—';
  return (
    <div className={styles.termLines}>
      {lines.map(line => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function renderValidUntil(value: string | null) {
  return formatPurchaseRequestDate(value);
}

function renderFiles(_value: unknown, row: PurchaseQuoteRow) {
  if (row.files.length === 0) return '—';
  return (
    <>
      {row.files.map(file => (
        <Button key={file.id} type='link' size='small' onClick={() => triggerFileDownload(file.url, file.name)}>
          {file.name}
        </Button>
      ))}
    </>
  );
}

export function purchaseRequestQuoteColumns(options: {
  canEdit: boolean;
  onEdit: (row: PurchaseQuoteRow) => void;
}): ColumnsType<PurchaseQuoteRow> {
  const columns: ColumnsType<PurchaseQuoteRow> = [
    { title: 'Поставщик', dataIndex: 'partner_name', ellipsis: true, render: renderPartner },
    { title: 'Цена', key: 'price', width: 140, render: renderPrice },
    { title: 'НДС', key: 'vat', width: 80, render: renderVat },
    { title: 'Оплата', key: 'terms', ellipsis: true, render: renderTerms },
    { title: 'Действует до', dataIndex: 'valid_until', width: 120, render: renderValidUntil },
    { title: 'Файл', key: 'files', width: 160, render: renderFiles },
  ];
  if (!options.canEdit) return columns;
  return [
    ...columns,
    {
      title: '',
      key: 'edit',
      width: 88,
      render: (_value, row) => (
        <Button type='link' size='small' onClick={() => options.onEdit(row)}>
          Изменить
        </Button>
      ),
    },
  ];
}
