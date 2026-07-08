import { ColumnType } from 'antd/es/table';

import { PatentGrant } from '@/types/patent';

export const columns: ColumnType<PatentGrant>[] = [
  {
    title: 'Номер охранного документа',
    dataIndex: 'grant_number',
    key: 'grant_number',
    width: 200,
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Дата продления',
    dataIndex: 'renewal_date',
    key: 'renewal_date',
    render: date => (date ? new Date(date).toLocaleDateString('ru-RU') : '-'),
    width: 150,
  },
];
