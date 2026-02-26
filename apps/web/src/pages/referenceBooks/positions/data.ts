import { Position } from '../../../types/referenceTypes';

export const columns = [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    sorter: (a: Position, b: Position) => a.name.localeCompare(b.name),
  },
];
