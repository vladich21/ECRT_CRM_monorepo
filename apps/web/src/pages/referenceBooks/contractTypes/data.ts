import { ColumnType } from 'antd/es/table';

import { ContractType } from '../../../types/contract';

export const columns: ColumnType<ContractType>[] = [
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
