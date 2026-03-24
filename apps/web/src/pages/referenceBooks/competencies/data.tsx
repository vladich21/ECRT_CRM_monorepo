import { Tag } from 'antd';
import { ColumnType } from 'antd/es/table';

import { PartnerCompetence } from '../../../types/partner';

export const initialColors = {
  color_bg: '#1890ff',
  color_text: '#ffffff',
  color_border: '#1890ff',
};

export const initialFormValues = {
  name: '',
  ...initialColors,
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
      <Tag
        style={{
          backgroundColor: record.color_bg,
          color: record.color_text,
          border: `1px solid ${record.color_border}`,
          fontWeight: 'bold',
        }}
      >
        {record.name}
      </Tag>
    ),
  },
];
