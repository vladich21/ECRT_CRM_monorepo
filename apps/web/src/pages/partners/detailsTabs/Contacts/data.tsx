import { Tag } from 'antd';

export const initialPartnerContactValues = {
  full_name: '',
  position: '',
  phone: '',
  email: '',
  is_primary: false,
};

export const getColumnsData = () => [
  {
    title: 'ФИО',
    dataIndex: 'full_name',
    key: 'full_name',
    render: (full_name: string) => full_name || '-',
  },
  {
    title: 'Должность',
    dataIndex: 'position',
    key: 'position',
    render: (position: string) => position || '-',
  },
  {
    title: 'Телефон',
    dataIndex: 'phone',
    key: 'phone',
    render: (phone: string) => phone || '-',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
    render: (email: string) => email || '-',
  },
  {
    title: 'Основной контакт',
    dataIndex: 'is_primary',
    key: 'is_primary',
    render: (is_primary: boolean) =>
      is_primary ? (
        <Tag color='rgba(47, 160, 75, 1)'>Основной</Tag>
      ) : (
        <Tag color='rgba(140, 140, 140, 1)'>Дополнительный</Tag>
      ),
  },
];
