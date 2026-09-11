import { Link } from 'react-router-dom';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { PurchaseRequestSupplierRow } from '@/api/procurement/requests/procurementRequest.types';

import { formatPurchaseRequestDateTime } from './purchaseRequestLabels';
import { SupplierFlagTags } from './purchaseRequestSupplierFlags';

function renderPartnerName(name: string, row: PurchaseRequestSupplierRow) {
  return <Link to={`/partners/${row.partner_id}`}>{name || 'Поставщик'}</Link>;
}

function renderInn(inn: string) {
  return inn || '—';
}

function renderFlags(_value: unknown, row: PurchaseRequestSupplierRow) {
  return <SupplierFlagTags flags={row.warning_snapshot} />;
}

function renderAddedAt(value: string) {
  return formatPurchaseRequestDateTime(value);
}

export const PURCHASE_REQUEST_SUPPLIER_COLUMNS: ColumnsType<PurchaseRequestSupplierRow> = [
  { title: 'Поставщик', dataIndex: 'name', ellipsis: true, render: renderPartnerName },
  { title: 'ИНН', dataIndex: 'inn', width: 140, render: renderInn },
  {
    title: (
      <Tooltip title='Категория оценки и ограничения контрагента на дату добавления в запрос, не текущее состояние'>
        Оценка и ограничения
      </Tooltip>
    ),
    key: 'flags',
    width: 280,
    render: renderFlags,
  },
  { title: 'Добавлен', dataIndex: 'added_at', width: 160, render: renderAddedAt },
];
