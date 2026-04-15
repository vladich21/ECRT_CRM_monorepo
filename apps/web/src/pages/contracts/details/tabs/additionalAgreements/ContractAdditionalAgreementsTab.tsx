import { useMemo } from 'react';
import { FileAddOutlined } from '@ant-design/icons';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useOutletContext } from 'react-router-dom';

import type { Contract } from '@/types/contract';
import styles from './ContractSupplementTabs.module.scss';

const { Text, Title } = Typography;

export type AdditionalAgreementListItem = {
  id: string;
  number: string;
  signedAt: string;
  subject: string;
  status: 'active' | 'draft' | 'expired';
  validFrom: string;
  validTo: string;
};

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
  const dataSource: AdditionalAgreementListItem[] = [];

  const columns: ColumnsType<AdditionalAgreementListItem> = useMemo(
    () => [
      {
        title: '\u2116 / вид',
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

        <Table
          size='middle'
          rowKey='id'
          pagination={false}
          columns={columns}
          dataSource={dataSource}
          locale={{ emptyText: 'Дополнительных соглашений нет' }}
        />
      </Card>
    </div>
  );
}
