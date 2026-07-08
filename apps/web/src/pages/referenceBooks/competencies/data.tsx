import { Tag } from 'antd';
import { ColumnType } from 'antd/es/table';

import { PartnerCompetence } from '@/types/partner';

export const initialFormValues = {
  name: '',
  is_active: true,
};

export const getColumnsData = (): ColumnType<PartnerCompetence>[] => [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    sorter: (a, b) => a.name.localeCompare(b.name),
  },
  {
    title: 'Пример отображения',
    key: 'preview',
    render: (_, record) => (
      <Tag color='geekblue' style={{ fontWeight: 600 }}>
        {record.name}
      </Tag>
    ),
  },
];
