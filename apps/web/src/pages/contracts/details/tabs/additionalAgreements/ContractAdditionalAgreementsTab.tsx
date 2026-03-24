import { useMemo } from 'react';
import { FileAddOutlined, LinkOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useOutletContext } from 'react-router-dom';

import type { Contract } from '../../../../../types/contract';
import styles from './ContractSupplementTabs.module.scss';

const { Text, Title } = Typography;
export const DEMO_ADDITIONAL_AGREEMENTS: {
  id: string;
  number: string;
  signedAt: string;
  subject: string;
  status: 'active' | 'draft' | 'expired';
  validFrom: string;
  validTo: string;
}[] = [
  {
    id: '1',
    number: 'ДС-1',
    signedAt: '2024-06-12',
    subject: 'Изменение срока исполнения обязательств по этапу «Поставка»',
    status: 'active',
    validFrom: '2024-06-15',
    validTo: '2025-12-31',
  },
  {
    id: '2',
    number: 'ДС-2',
    signedAt: '2025-01-20',
    subject: 'Корректировка стоимости работ без изменения объёма',
    status: 'active',
    validFrom: '2025-02-01',
    validTo: '2026-06-30',
  },
  {
    id: '3',
    number: 'ДС-3 (проект)',
    signedAt: '',
    subject: 'Передача прав на результаты интеллектуальной деятельности',
    status: 'draft',
    validFrom: '',
    validTo: '',
  },
];
type OutletContext = {
  contract: Contract;
};
const statusConfig = {
  active: { label: 'Действует', color: 'success' as const },
  draft: { label: 'Проект', color: 'default' as const },
  expired: { label: 'Истёк', color: 'error' as const },
};
function formatRuDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}
export function ContractAdditionalAgreementsTab() {
  const { contract } = useOutletContext<OutletContext>();
  const columns: ColumnsType<(typeof DEMO_ADDITIONAL_AGREEMENTS)[0]> = useMemo(
    () => [
      {
        title: '№ / вид',
        dataIndex: 'number',
        key: 'number',
        width: 120,
        render: (text, row) => (
          <Space direction='vertical' size={0}>
            <Text strong>{text}</Text>
            <Text type='secondary' className={styles.subMuted}>
              id: {row.id}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Дата подписания',
        dataIndex: 'signedAt',
        key: 'signedAt',
        width: 130,
        render: (v: string) => formatRuDate(v),
      },
      {
        title: 'Суть изменений',
        dataIndex: 'subject',
        key: 'subject',
        ellipsis: true,
      },
      {
        title: 'Статус',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        render: (s: keyof typeof statusConfig) => {
          const cfg = statusConfig[s];
          return <Tag color={cfg.color}>{cfg.label}</Tag>;
        },
      },
      {
        title: 'Срок действия',
        key: 'period',
        width: 200,
        render: (_, row) => (
          <span>
            {formatRuDate(row.validFrom)} — {formatRuDate(row.validTo)}
          </span>
        ),
      },
    ],
    [],
  );
  return (
    <div className={styles.tabRoot}>
      <Card className={styles.card}>
        <div className={styles.cardHead}>
          <div>
            <Title level={4} className={styles.cardTitle}>
              Дополнительные соглашения
            </Title>
            <Text type='secondary'>
              К договору №{contract.number}
              {contract.cipher ? ` (${contract.cipher})` : ''} привязаны отдельные документы (ДС), которые изменяют
              условия основного договора.
            </Text>
          </div>
          <Button type='primary' icon={<FileAddOutlined />} disabled>
            Добавить ДС
          </Button>
        </div>

        <Alert
          className={styles.alert}
          type='info'
          showIcon
          message='Демонстрационные данные'
          description='Список ниже показывает, как может выглядеть вкладка после подключения API: учёт номеров ДС, дат, статусов и сроков.'
        />

        <Table
          size='middle'
          rowKey='id'
          pagination={false}
          columns={columns}
          dataSource={DEMO_ADDITIONAL_AGREEMENTS}
          locale={{ emptyText: 'Дополнительных соглашений нет' }}
        />

        <div className={styles.footerHint}>
          <LinkOutlined /> В перспективе: ссылка на скан ДС, связь с редакциями договора, уведомления о истечении срока
          действия ДС.
        </div>
      </Card>
    </div>
  );
}
