import { Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { PurchaseRequestListRow } from '@/api/procurement/requests/procurementRequestApi';

import type { PurchaseRequestListColumnKey } from './purchaseRequestListColumns';
import { PURCHASE_REQUEST_LIST_COLUMN_KEYS, PURCHASE_REQUEST_LIST_COLUMN_LABELS } from './purchaseRequestListColumns';
import {
  formatPurchaseRequestAmount,
  formatPurchaseRequestDate,
  purchaseRequestStatusLabel,
  purchaseRequestStatusTagColor,
} from './purchaseRequestLabels';

function renderNumber(value: number) {
  return `№ ${value}`;
}

function renderStatus(status: string) {
  return <Tag color={purchaseRequestStatusTagColor(status)}>{purchaseRequestStatusLabel(status)}</Tag>;
}

function renderUrgent(_value: unknown, row: PurchaseRequestListRow) {
  return row.is_urgent ? <Tag color='error'>Срочно</Tag> : null;
}

function renderAmount(_value: unknown, row: PurchaseRequestListRow) {
  return formatPurchaseRequestAmount(row.amount, row.currency_code);
}

function renderDate(value: string) {
  return formatPurchaseRequestDate(value);
}

function renderDash(value: string | null) {
  return value || '—';
}

const COLUMN_DEFS: Record<PurchaseRequestListColumnKey, ColumnsType<PurchaseRequestListRow>[number]> = {
  number: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.number,
    dataIndex: 'number',
    width: 88,
    render: renderNumber,
  },
  subject: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.subject,
    dataIndex: 'subject',
    ellipsis: true,
  },
  status: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.status,
    dataIndex: 'status',
    width: 160,
    render: renderStatus,
  },
  project: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.project,
    dataIndex: 'project_name',
    ellipsis: true,
    render: renderDash,
  },
  initiator: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.initiator,
    dataIndex: 'initiator_name',
    ellipsis: true,
    render: renderDash,
  },
  lead: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.lead,
    dataIndex: 'lead_manager_name',
    ellipsis: true,
    render: renderDash,
  },
  amount: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.amount,
    key: 'amount',
    width: 140,
    render: renderAmount,
  },
  request_date: {
    title: PURCHASE_REQUEST_LIST_COLUMN_LABELS.request_date,
    dataIndex: 'request_date',
    width: 120,
    render: renderDate,
  },
};

export function purchaseRequestListColumns(
  visible: ReadonlySet<PurchaseRequestListColumnKey>,
): ColumnsType<PurchaseRequestListRow> {
  const columns: ColumnsType<PurchaseRequestListRow> = PURCHASE_REQUEST_LIST_COLUMN_KEYS.filter(key =>
    visible.has(key),
  ).map(key => COLUMN_DEFS[key]);
  return [
    ...columns,
    {
      title: '',
      key: 'urgent',
      width: 96,
      render: renderUrgent,
    },
  ];
}
