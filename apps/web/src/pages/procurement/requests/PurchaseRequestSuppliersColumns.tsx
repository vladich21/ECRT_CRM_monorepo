import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { PurchaseRequestSupplierRow } from '@/api/procurement/requests/procurementRequest.types';

import { formatPurchaseRequestDateTime } from './purchaseRequestLabels';
import { PurchaseRequestPartnerLink } from './PurchaseRequestPartnerLink';
import { SupplierFlagTags } from './purchaseRequestSupplierFlags';

function renderPartnerName(name: string, row: PurchaseRequestSupplierRow) {
  return <PurchaseRequestPartnerLink partnerId={row.partner_id}>{name || 'Поставщик'}</PurchaseRequestPartnerLink>;
}

function renderInn(inn: string) {
  return inn || '—';
}

function renderFlags(_value: unknown, row: PurchaseRequestSupplierRow) {
  return <SupplierFlagTags flags={row.current_flags ?? row.warning_snapshot} snapshot={row.warning_snapshot} />;
}

function renderAddedAt(value: string) {
  return formatPurchaseRequestDateTime(value);
}

export const PURCHASE_REQUEST_SUPPLIER_COLUMNS: ColumnsType<PurchaseRequestSupplierRow> = [
  { title: 'Поставщик', dataIndex: 'name', ellipsis: true, render: renderPartnerName },
  { title: 'ИНН', dataIndex: 'inn', width: 140, render: renderInn },
  {
    title: (
      <Tooltip title='Взвешенный балл и ограничения контрагента по проекту запроса на текущий момент. Наведите на балл, чтобы увидеть состояние на дату добавления в запрос'>
        Оценка и ограничения
      </Tooltip>
    ),
    key: 'flags',
    width: 280,
    render: renderFlags,
  },
  { title: 'Добавлен', dataIndex: 'added_at', width: 160, render: renderAddedAt },
];
