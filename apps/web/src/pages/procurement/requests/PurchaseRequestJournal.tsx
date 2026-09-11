import type { ReactNode } from 'react';
import { Alert, Button, Empty, Spin, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type { PurchaseRequestJournalEntry } from '@/api/procurement/requests/procurementRequest.types';
import { usePurchaseRequestJournal } from '@/api/procurement/requests/procurementRequestApiHooks';

import styles from './PurchaseRequestJournal.module.scss';
import {
  formatIncomeLinkSnapshot,
  formatLeadSnapshot,
  formatPriceSnapshot,
  formatPurchaseMethodSnapshot,
  formatPurchaseRequestDateTime,
  formatQuoteSnapshot,
  formatRouteDocumentSnapshot,
  formatSelectionSnapshot,
  formatSupplierSnapshot,
  PURCHASE_REQUEST_PATCH_FIELD_LABELS,
  purchaseRequestJournalActionLabel,
} from './purchaseRequestLabels';

const { Text } = Typography;

type Props = {
  requestId: string;
};

type Row = {
  key: string;
  action: string;
  actor: string;
  when: string;
  details: ReactNode;
};

const JOURNAL_COLUMNS: ColumnsType<Row> = [
  { title: 'Действие', dataIndex: 'action', width: 240 },
  { title: 'Пользователь', dataIndex: 'actor', ellipsis: true },
  { title: 'Когда', dataIndex: 'when', width: 160 },
  { title: 'Подробности', dataIndex: 'details' },
];

export function PurchaseRequestJournal({ requestId }: Props) {
  const { data = [], isLoading, isError, refetch } = usePurchaseRequestJournal(requestId);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <Spin />
      </div>
    );
  }
  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Не удалось загрузить историю'
        action={
          <Button size='small' onClick={() => void refetch()}>
            Повторить
          </Button>
        }
      />
    );
  }
  if (data.length === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Записей пока нет' />;
  }

  const rows: Row[] = data.map(entry => ({
    key: entry.id,
    action: purchaseRequestJournalActionLabel(entry.action),
    actor: entry.actor_name || 'Пользователь',
    when: formatPurchaseRequestDateTime(entry.created_at),
    details: <JournalBody entry={entry} />,
  }));

  return <Table<Row> size='small' pagination={false} rowKey='key' dataSource={rows} columns={JOURNAL_COLUMNS} />;
}

function JournalBody({ entry }: { entry: PurchaseRequestJournalEntry }) {
  if (entry.action === 'method_selected') {
    return <Text type='secondary'>{formatPurchaseMethodSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'route_started') {
    return <Text type='secondary'>{formatRouteDocumentSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'supplier_selected') {
    return <Text type='secondary'>{formatSelectionSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'price_fixed') {
    return <Text type='secondary'>{formatPriceSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'quote_added' || entry.action === 'quote_updated') {
    return <Text type='secondary'>{formatQuoteSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'supplier_added') {
    return <Text type='secondary'>{formatSupplierSnapshot(entry.payload.to)}</Text>;
  }
  if (entry.action === 'lead_assigned') {
    return (
      <div className={styles.body}>
        <Text type='secondary'>Было: {formatLeadSnapshot(entry.payload.from)}</Text>
        <Text>Стало: {formatLeadSnapshot(entry.payload.to)}</Text>
      </div>
    );
  }
  if (entry.action === 'income_link_changed') {
    return (
      <div className={styles.body}>
        <Text type='secondary'>Было: {formatIncomeLinkSnapshot(entry.payload.from)}</Text>
        <Text>Стало: {formatIncomeLinkSnapshot(entry.payload.to)}</Text>
        {entry.comment ? <Text type='secondary'>Комментарий: {entry.comment}</Text> : null}
      </div>
    );
  }
  if (entry.action === 'updated' && entry.payload.fields?.length) {
    const labels = entry.payload.fields.map(field => PURCHASE_REQUEST_PATCH_FIELD_LABELS[field] ?? field);
    return <Text type='secondary'>Поля: {labels.join(', ')}</Text>;
  }
  if (entry.action === 'created' && entry.payload.to) {
    return <Text type='secondary'>Доходный договор: {formatIncomeLinkSnapshot(entry.payload.to)}</Text>;
  }
  return entry.comment ? <Text type='secondary'>{entry.comment}</Text> : <Text type='secondary'>—</Text>;
}
