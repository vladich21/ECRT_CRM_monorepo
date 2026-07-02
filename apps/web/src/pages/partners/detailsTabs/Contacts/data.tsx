import { Tag } from 'antd';

import {
  EMPTY_PARTNER_CONTACT_PHONE,
  formatContactPhoneLabel,
  getContactPhonesForDisplay,
} from '@/helpers/partnerContactPhoneHelpers';

export const initialPartnerContactValues = {
  full_name: '',
  position: '',
  phone: '',
  phone_ext: '',
  phones: [{ ...EMPTY_PARTNER_CONTACT_PHONE }],
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
    dataIndex: 'phones',
    key: 'phone',
    render: (_phones: unknown, record: Parameters<typeof getContactPhonesForDisplay>[0]) => {
      const labels = getContactPhonesForDisplay(record).map(formatContactPhoneLabel).filter(Boolean);
      return labels.length ? labels.join('; ') : '-';
    },
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
