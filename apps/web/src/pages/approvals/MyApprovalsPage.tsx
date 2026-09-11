import { useMemo, useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { App, Button, Card, Input, Popconfirm, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import {
  useCompleteTask,
  useMyInitiated,
  useMyParticipated,
  useMyTaskList,
  useMyTasks,
} from '@/api/approvals/approvalApiHooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { APPROVAL_STATUS_LABELS, type MyProcessItem, type MyTaskItem, type TaskItem } from '@/types/approval';

const SEARCH_DEBOUNCE_MS = 350;

const PRIORITY_TAG: Record<TaskItem['priority'], { color: string; label: string }> = {
  low: { color: 'default', label: 'Низкий' },
  normal: { color: 'blue', label: 'Обычный' },
  high: { color: 'orange', label: 'Высокий' },
  urgent: { color: 'red', label: 'Срочный' },
};

const ENTITY_BASE: Record<string, string> = {
  contract: '/contracts',
  partner: '/partners',
  patent: '/patents',
  project: '/projects',
  purchase_request: '/procurement/requests',
  purchase_request_agreement: '/procurement/requests',
};

const ENTITY_LABEL: Record<string, string> = {
  contract: 'Договор',
  partner: 'Контрагент',
  patent: 'Патент / РИД',
  project: 'Проект',
  purchase_request: 'Запрос на закупку',
  purchase_request_agreement: 'Запрос на закупку',
};

function entityLink(entityType: string, entityId: string) {
  const base = ENTITY_BASE[entityType];
  return base ? `${base}/${entityId}` : '#';
}

function entityCell(entityType: string, entityId: string) {
  return <Link to={entityLink(entityType, entityId)}>{ENTITY_LABEL[entityType] ?? entityType}</Link>;
}

function matchesSearch(haystacks: Array<string | null | undefined>, query: string): boolean {
  if (!query) return true;
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystacks.some(value => (value ?? '').toLowerCase().includes(needle));
}

function renderTaskObject(_value: unknown, row: MyTaskItem) {
  return (
    <>
      {entityCell(row.entity_type, row.entity_id)}
      {row.is_urgent ? (
        <>
          {' '}
          <Tag color='error'>Срочно</Tag>
        </>
      ) : null}
    </>
  );
}

const taskColumns: ColumnsType<MyTaskItem> = [
  { title: 'Объект', render: renderTaskObject },
  { title: 'Маршрут', dataIndex: 'route_name' },
  { title: 'Текущий шаг', dataIndex: 'step_name' },
  {
    title: 'Запущено',
    dataIndex: 'initiated_at',
    render: (v: string) => new Date(v).toLocaleDateString('ru-RU'),
  },
];

const processColumns: ColumnsType<MyProcessItem> = [
  { title: 'Объект', render: (_, r) => entityCell(r.entity_type, r.entity_id) },
  { title: 'Маршрут', dataIndex: 'route_name' },
  {
    title: 'Статус',
    dataIndex: 'status',
    render: (s: MyProcessItem['status']) => <Tag>{APPROVAL_STATUS_LABELS[s]}</Tag>,
  },
  {
    title: 'Запущено',
    dataIndex: 'initiated_at',
    render: (v: string) => new Date(v).toLocaleDateString('ru-RU'),
  },
];

export default function MyApprovalsPage() {
  const { message } = App.useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, SEARCH_DEBOUNCE_MS);
  const tasks = useMyTasks();
  const initiated = useMyInitiated();
  const participated = useMyParticipated();
  const postTasks = useMyTaskList();
  const complete = useCompleteTask();

  const handleComplete = async (id: string) => {
    await complete.mutateAsync(id);
    message.success('Задача выполнена');
  };

  const postTaskColumns: ColumnsType<TaskItem> = [
    {
      title: 'Задача',
      render: (_, r) =>
        r.entity_type && r.entity_id ? <Link to={entityLink(r.entity_type, r.entity_id)}>{r.title}</Link> : r.title,
    },
    {
      title: 'Объект',
      render: (_, r) => (r.entity_type && r.entity_id ? entityCell(r.entity_type, r.entity_id) : '-'),
    },
    {
      title: 'Срок',
      dataIndex: 'due_date',
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString('ru-RU') : '-'),
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      render: (p: TaskItem['priority']) => <Tag color={PRIORITY_TAG[p].color}>{PRIORITY_TAG[p].label}</Tag>,
    },
    {
      title: '',
      width: 130,
      render: (_, r) => (
        <Popconfirm title='Отметить задачу выполненной?' onConfirm={() => handleComplete(r.id)}>
          <Button size='small' type='primary'>
            Выполнить
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const filteredPostTasks = useMemo(
    () =>
      (postTasks.data ?? []).filter(row =>
        matchesSearch([row.title, ENTITY_LABEL[row.entity_type ?? ''], row.entity_type], debouncedSearch),
      ),
    [postTasks.data, debouncedSearch],
  );
  const filteredTasks = useMemo(
    () =>
      (tasks.data ?? []).filter(row =>
        matchesSearch([ENTITY_LABEL[row.entity_type], row.route_name, row.step_name, row.entity_type], debouncedSearch),
      ),
    [tasks.data, debouncedSearch],
  );
  const filteredInitiated = useMemo(
    () =>
      (initiated.data ?? []).filter(row =>
        matchesSearch([ENTITY_LABEL[row.entity_type], row.route_name, row.entity_type], debouncedSearch),
      ),
    [initiated.data, debouncedSearch],
  );
  const filteredParticipated = useMemo(
    () =>
      (participated.data ?? []).filter(row =>
        matchesSearch([ENTITY_LABEL[row.entity_type], row.route_name, row.entity_type], debouncedSearch),
      ),
    [participated.data, debouncedSearch],
  );

  return (
    <Card
      title='Мои согласования'
      extra={
        <Input
          allowClear
          style={{ width: 280 }}
          prefix={<SearchOutlined />}
          placeholder='Объект, маршрут или задача…'
          value={searchQuery}
          onChange={event => setSearchQuery(event.target.value)}
        />
      }
    >
      <Tabs
        items={[
          {
            key: 'post-tasks',
            label: `Мои задачи (${postTasks.data?.length ?? 0})`,
            children: (
              <Table
                rowKey='id'
                size='small'
                loading={postTasks.isLoading}
                dataSource={filteredPostTasks}
                columns={postTaskColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
          {
            key: 'tasks',
            label: `Мне на согласование (${tasks.data?.length ?? 0})`,
            children: (
              <Table
                rowKey='process_id'
                size='small'
                loading={tasks.isLoading}
                dataSource={filteredTasks}
                columns={taskColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
          {
            key: 'initiated',
            label: `Инициированные мной (${initiated.data?.length ?? 0})`,
            children: (
              <Table
                rowKey='id'
                size='small'
                loading={initiated.isLoading}
                dataSource={filteredInitiated}
                columns={processColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
          {
            key: 'participated',
            label: `С моим участием (${participated.data?.length ?? 0})`,
            children: (
              <Table
                rowKey='id'
                size='small'
                loading={participated.isLoading}
                dataSource={filteredParticipated}
                columns={processColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
