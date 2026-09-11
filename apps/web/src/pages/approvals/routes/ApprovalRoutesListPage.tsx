import { PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Popconfirm, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useApprovalEntityTypes,
  useApprovalRoutesList,
  useDeleteRoute,
} from '@/api/approvals/approvalApiHooks';
import type { ApprovalEntityTypeRef, ApprovalRouteListItem } from '@/types/approval';

function extractError(e: unknown): string | undefined {
  const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join(', ') : msg;
}

export default function ApprovalRoutesListPage() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [entityType, setEntityType] = useState<string | undefined>();

  const entityTypes = useApprovalEntityTypes();
  const routes = useApprovalRoutesList(entityType);
  const del = useDeleteRoute();

  const entityNameByCode = useMemo(() => {
    const map = new Map<string, string>();
    (entityTypes.data ?? []).forEach((t: ApprovalEntityTypeRef) => map.set(t.code, t.name));
    return map;
  }, [entityTypes.data]);

  const handleDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
      message.success('Маршрут удален');
    } catch (e) {
      message.error(extractError(e) ?? 'Не удалось удалить маршрут');
    }
  };

  const columns: ColumnsType<ApprovalRouteListItem> = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (name: string, r) => (
        <Space>
          <span>{name}</span>
          {r.isDefault ? <Tag color="blue">По умолчанию</Tag> : null}
          {!r.isActive ? <Tag>Неактивен</Tag> : null}
        </Space>
      ),
    },
    { title: 'Код', dataIndex: 'code' },
    {
      title: 'Тип сущности',
      dataIndex: 'entityTypeCode',
      render: (code: string | null) => (code ? entityNameByCode.get(code) ?? code : '-'),
    },
    { title: 'Шагов', dataIndex: 'stepCount', width: 90 },
    {
      title: 'Действия',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/admin/approval-routes/${r.id}/edit`)}>
            Изменить
          </Button>
          <Popconfirm title="Удалить маршрут?" okButtonProps={{ danger: true }} onConfirm={() => handleDelete(r.id)}>
            <Button size="small" danger>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Маршруты согласования"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/admin/approval-routes/create')}>
          Создать маршрут
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          style={{ width: 280 }}
          allowClear
          placeholder="Фильтр по типу сущности"
          value={entityType}
          onChange={setEntityType}
          options={(entityTypes.data ?? []).map((t: ApprovalEntityTypeRef) => ({ value: t.code, label: t.name }))}
        />
        <Table
          rowKey="id"
          size="small"
          loading={routes.isLoading}
          dataSource={routes.data ?? []}
          columns={columns}
          pagination={{ pageSize: 20, hideOnSinglePage: true }}
        />
      </Space>
    </Card>
  );
}
