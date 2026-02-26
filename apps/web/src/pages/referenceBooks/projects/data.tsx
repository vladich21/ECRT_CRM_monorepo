import { Tag } from 'antd';
import { User } from '../../../types/user';
import { ColumnType } from 'antd/es/table';
import { Project } from '../../../types/referenceTypes';

// Начальные значения формы
export const initialFormValues = {
  code: '',
  name: '',
  short_name: '',
  description: '',
  start_date: '',
  end_date: '',
  manager_id: null,
  status: 'active',
};

export const getColumnsData = (): ColumnType<Project>[] => [
  {
    title: 'Код',
    dataIndex: 'code',
    key: 'code',
    render: (code: string | number) => code ?? '-',
    sorter: (a: Project, b: Project) => String(a.code).localeCompare(String(b.code)),
  },
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => name || '-',
    sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
  },
  {
    title: 'Короткое название',
    dataIndex: 'short_name',
    key: 'short_name',
    render: (short_name: string) => short_name || '-',
  },
  {
    title: 'Описание',
    dataIndex: 'description',
    key: 'description',
    render: (description: string) => description || '-',
    ellipsis: true,
  },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const statusConfig = {
        active: { color: 'rgba(47, 160, 75, 1)', text: 'Активный' },
        completed: { color: 'rgba(24, 144, 255, 1)', text: 'Завершен' },
        pending: { color: 'rgba(250, 173, 20, 1)', text: 'В ожидании' },
        paused: { color: 'rgba(140, 140, 140, 1)', text: 'Приостановлен' },
        cancelled: { color: 'rgba(139, 39, 39, 1)', text: 'Отменен' },
      };

      const config = statusConfig[status as keyof typeof statusConfig] || {
        color: '#d9d9d9',
        text: status,
      };

      return <Tag color={config.color}>{config.text}</Tag>;
    },
    filters: [
      { text: 'Активный', value: 'active' },
      { text: 'Завершен', value: 'completed' },
      { text: 'В ожидании', value: 'pending' },
      { text: 'Приостановлен', value: 'paused' },
      { text: 'Отменен', value: 'cancelled' },
    ],
    onFilter: (value: string | number | boolean | bigint, record: Project) => {
      return record.status === value;
    },
  },
  {
    title: 'Дата начала',
    dataIndex: 'start_date',
    key: 'start_date',
    render: (start_date: string) => (start_date ? new Date(start_date).toLocaleDateString('ru-RU') : '-'),
    sorter: (a: Project, b: Project) =>
      (a.start_date ? new Date(a.start_date).getTime() : 0) - (b.start_date ? new Date(b.start_date).getTime() : 0),
  },
  {
    title: 'Дата окончания',
    dataIndex: 'end_date',
    key: 'end_date',
    render: (end_date: string) => (end_date ? new Date(end_date).toLocaleDateString('ru-RU') : '-'),
    sorter: (a: Project, b: Project) => {
      if (!a.end_date && !b.end_date) return 0;
      if (!a.end_date) return -1;
      if (!b.end_date) return 1;
      return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
    },
  },
];
