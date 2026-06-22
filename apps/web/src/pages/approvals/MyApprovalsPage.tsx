import { App, Button, Card, Popconfirm, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Link } from 'react-router-dom';

import {
  useCompleteTask,
  useMyInitiated,
  useMyParticipated,
  useMyTaskList,
  useMyTasks,
} from '@/api/approvals/approvalApiHooks';
import { APPROVAL_STATUS_LABELS, type MyProcessItem, type MyTaskItem, type TaskItem } from '@/types/approval';

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
};

const ENTITY_LABEL: Record<string, string> = {
  contract: 'Договор',
  partner: 'Контрагент',
  patent: 'Патент / РИД',
  project: 'Проект',
};

function entityLink(entityType: string, entityId: string) {
  const base = ENTITY_BASE[entityType];
  return base ? `${base}/${entityId}` : '#';
}

function entityCell(entityType: string, entityId: string) {
  return <Link to={entityLink(entityType, entityId)}>{ENTITY_LABEL[entityType] ?? entityType}</Link>;
}

const taskColumns: ColumnsType<MyTaskItem> = [
  { title: 'Объект', render: (_, r) => entityCell(r.entity_type, r.entity_id) },
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
    { title: 'Задача', dataIndex: 'title' },
    {
      title: 'Объект',
      render: (_, r) => (r.entity_type && r.entity_id ? entityCell(r.entity_type, r.entity_id) : '—'),
    },
    {
      title: 'Срок',
      dataIndex: 'due_date',
      render: (v: string | null) => (v ? new Date(v).toLocaleDateString('ru-RU') : '—'),
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
        <Popconfirm title="Отметить задачу выполненной?" onConfirm={() => handleComplete(r.id)}>
          <Button size="small" type="primary">
            Выполнить
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Card title="Мои согласования">
      <Tabs
        items={[
          {
            key: 'post-tasks',
            label: `Мои задачи (${postTasks.data?.length ?? 0})`,
            children: (
              <Table
                rowKey="id"
                size="small"
                loading={postTasks.isLoading}
                dataSource={postTasks.data ?? []}
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
                rowKey="process_id"
                size="small"
                loading={tasks.isLoading}
                dataSource={tasks.data ?? []}
                columns={taskColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
          {
            key: 'initiated',
            label: 'Инициированные мной',
            children: (
              <Table
                rowKey="id"
                size="small"
                loading={initiated.isLoading}
                dataSource={initiated.data ?? []}
                columns={processColumns}
                pagination={{ pageSize: 20, hideOnSinglePage: true }}
              />
            ),
          },
          {
            key: 'participated',
            label: 'С моим участием',
            children: (
              <Table
                rowKey="id"
                size="small"
                loading={participated.isLoading}
                dataSource={participated.data ?? []}
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
