import { getNameById } from '../../helpers/getNameById';
import { FilePreviewLink } from '../../components/filePreview/FilePreviewModal';

export const getColumnsData = (users: { id: string; name: string }[]) => [
  {
    title: 'Название файла',
    dataIndex: 'name',
    key: 'file',
    render: (fileName: string, record: any) => (
      <FilePreviewLink url={record.url} filename={fileName || 'Без названия'} />
    ),
  },
  {
    title: 'Размер файла',
    dataIndex: 'size',
    key: 'size',
    render: (size: string | null) => (size ? `${(Number(size) / 1024).toFixed(1)} Кбайт` : '-'),
  },
  {
    title: 'Кто добавил',
    dataIndex: 'uploadedby_id',
    key: 'uploadedby_id',
    render: (userId: string | null) => getNameById(userId ?? '', users) || '-',
  },
  {
    title: 'Дата загрузки',
    dataIndex: 'uploaded_at',
    key: 'uploaded_at',
    render: (uploaded_at: string | null) => (uploaded_at ? new Date(uploaded_at).toLocaleDateString('ru-RU') : '-'),
  },
];
