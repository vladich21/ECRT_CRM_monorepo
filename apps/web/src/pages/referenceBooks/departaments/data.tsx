import { Tag } from 'antd';
import { getNameById } from '../../../helpers/getNameById';
import { ReferenceData } from '../../../api/hooks/useReferences';

// Начальные значения формы
export const initialFormValues = {
  name: '',
  short_name: '',
  manager_id: null,
  parent_id: null,
  is_active: true,
};

export const getColumnsData = (referenceBooks: Pick<ReferenceData, 'users' | 'departments'>) => [
  {
    title: 'Статус',
    dataIndex: 'is_active',
    key: 'is_active',
    render: (is_active: boolean) =>
      is_active ? <Tag color='rgba(47, 160, 75, 1)'>Активен</Tag> : <Tag color='rgba(139, 39, 39, 1)'>Не активен</Tag>,
  },
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => name || '-',
  },
  {
    title: 'Короткое название',
    dataIndex: 'short_name',
    key: 'short_name',
    render: (short_name: string) => short_name || '-',
  },
  {
    title: 'Руководитель',
    dataIndex: 'manager_id',
    key: 'manager_id',
    render: (manager_id: string) => getNameById(manager_id, referenceBooks.users) || '-',
  },
  {
    title: 'Родительский отдел',
    dataIndex: 'parent_id',
    key: 'parent_id',
    render: (parent_id: string) => getNameById(parent_id, referenceBooks.departments) || '-',
  },
];
