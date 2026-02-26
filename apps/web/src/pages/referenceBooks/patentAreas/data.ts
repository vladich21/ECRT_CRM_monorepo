import { ColumnType } from 'antd/es/table';
import { PatentArea } from '../../../types/patent';

export const columns: ColumnType<PatentArea>[] = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Код',
    dataIndex: 'code',
    key: 'code',
    width: 120,
  },
  {
    title: 'Описание',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
];
