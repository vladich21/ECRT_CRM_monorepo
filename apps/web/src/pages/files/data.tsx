import Link from 'antd/es/typography/Link';
import { getNameById } from '../../helpers/getNameById';

export const getColumnsData = (users: { id: string; name: string }[]) => [
  {
    title: 'Название файла',
    dataIndex: 'name',
    key: 'file',
    render: (fileName: string, record: any) => (
      <Link href={record.url} target='_blank' rel='noopener noreferrer'>
        {fileName || 'Без названия'}
      </Link>
    ),
  },
  {
    title: 'Размер файла',
    dataIndex: 'size',
    key: 'size',
    render: (size: number | null) => (size ? `${(size / 1024).toFixed(1)} Кбайт` : '-'),
  },
  {
    title: 'Кто добавил',
    dataIndex: 'uploadedby_id',
    key: 'uploadedby_id',
    render: (userId: string) => getNameById(userId, users) || '-',
  },
  {
    title: 'Дата загрузки',
    dataIndex: 'uploaded_at',
    key: 'uploaded_at',
    render: (uploaded_at: string) => new Date(uploaded_at).toLocaleDateString('ru-RU') || '-',
  },
];
