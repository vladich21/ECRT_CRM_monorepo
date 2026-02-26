import { ColumnType } from 'antd/es/table';
import { PartnerEconomicCategory } from '../../../types/partner';

export const columns: ColumnType<PartnerEconomicCategory>[] = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Описание',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
];
