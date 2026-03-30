import { Tag } from 'antd';

import {
  getActiveInactiveSurface,
  mutedTagStyle,
  SURFACE_BLOCKED,
  SURFACE_NEUTRAL,
} from '../../../constants/statusBadgeSurfaces';
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
      is_active === undefined ? (
        '-'
      ) : (
        <Tag bordered={false} style={mutedTagStyle(getActiveInactiveSurface(is_active))}>
          {is_active ? 'Активен' : 'Не активен'}
        </Tag>
      ),
  },
  {
    title: 'ФИО',
    dataIndex: 'fio',
    key: 'fio',
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
          record.roles.map(role => (
            <Tag key={role.id} bordered={false} style={mutedTagStyle(SURFACE_NEUTRAL)}>
              {role.role_name}
            </Tag>
          ))
        ) : (
          <Tag bordered={false} style={mutedTagStyle(SURFACE_BLOCKED)}>
            Роли не назначены
          </Tag>
        )}
      </div>
    ),
  },
];
