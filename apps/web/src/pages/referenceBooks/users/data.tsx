import { Tag } from 'antd';
import { Department, Position, User } from '../../../types/user';

export const initialFormValues = {
  last_name: '',
  first_name: '',
  middle_name: '',
  email: '',
  phone: '',
  department_id: null,
  position_id: null,
  workplace_id: null,
  role_ids: [],
  is_active: true,
};

export const getColumnsData = () => [
  {
    title: 'Статус',
    dataIndex: 'is_active',
    key: 'is_active',
    render: (is_active: boolean | undefined) =>
      is_active === undefined ? '-' : is_active ? (
        <Tag color='rgba(47, 160, 75, 1)'>Активен</Tag>
      ) : (
        <Tag color='rgba(139, 39, 39, 1)'>Не активен</Tag>
      ),
  },
  {
    title: 'ФИО',
    dataIndex: 'fio',
    key: 'fio',
    render: (login: string) => login || '-',
  },
  {
    title: 'Логин',
    dataIndex: 'login',
    key: 'login',
    render: (login: string) => login || '-',
  },
  {
    title: 'Отдел',
    dataIndex: 'department',
    key: 'department',
    render: (department: Department) => department?.name || '-',
  },
  {
    title: 'Должность',
    dataIndex: 'position',
    key: 'position',
    render: (position: Position) => position?.name || '-',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    render: (email: string) => email || '-',
  },
  {
    title: 'Роли',
    key: 'roles',
    render: (_: any, record: User) => (
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {record.roles?.length > 0 ? (
          record.roles.map(role => <Tag key={role.id}>{role.role_name}</Tag>)
        ) : (
          <Tag color='#b64141ff'>Роли не назначены</Tag>
        )}
      </div>
    ),
  },
];
