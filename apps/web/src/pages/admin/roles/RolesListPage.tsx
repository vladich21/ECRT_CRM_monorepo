import { useMemo, useState } from 'react';
import { Alert, Button, Drawer, Input, Popconfirm, Space, Table, Tag, Tooltip, message } from 'antd';
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, SettingOutlined } from '@ant-design/icons';
import type { ColumnType } from 'antd/es/table';

import {
  useAdminRolesList,
  useCreateRole,
  useDeleteRole,
  useUpdateRole,
} from '../../../api/adminRbac/adminRbacApiHooks';
import type { AdminRole } from '../../../api/adminRbac/adminRbacApi';
import { usePermissions } from '../../../hooks/usePermissions';
import { SECTIONS } from '../../../shared/permissions';
import { RoleEditDrawer } from './RoleEditDrawer';
import { RolePermissionsMatrix } from './RolePermissionsMatrix';

export default function RolesListPage() {
  const { canEdit, canDelete } = usePermissions();
  const isEditor = canEdit(SECTIONS.ADMIN_ROLES);
  const isDeleter = canDelete(SECTIONS.ADMIN_ROLES);

  const { data: roles = [], isLoading } = useAdminRolesList();
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();

  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [permissionsRoleId, setPermissionsRoleId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const q = search.trim().toLowerCase();
    return roles.filter(
      r => r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q),
    );
  }, [roles, search]);

  const handleDelete = (role: AdminRole) => {
    deleteMut.mutate(role.id, {
      onSuccess: () => message.success(`Роль «${role.name}» удалена`),
      onError: (err) => {
        const msg = err instanceof Error ? err.message : 'Не удалось удалить роль';
        message.error(msg);
      },
    });
  };

  const columns: ColumnType<AdminRole>[] = [
    {
      title: 'Название',
      dataIndex: 'name',
      render: (name: string, role) => (
        <Space>
          <strong>{name}</strong>
          {role.is_system && (
            <Tooltip title='Системная роль — защищена от удаления'>
              <Tag icon={<LockOutlined />} color='gold'>системная</Tag>
            </Tooltip>
          )}
          {!role.is_active && <Tag color='red'>неактивна</Tag>}
        </Space>
      ),
    },
    {
      title: 'Код',
      dataIndex: 'code',
      width: 200,
      render: (code: string) => <code>{code}</code>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Пользователей',
      dataIndex: 'member_count',
      width: 130,
      align: 'right',
    },
    {
      title: 'Прав',
      dataIndex: 'permission_count',
      width: 90,
      align: 'right',
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 220,
      render: (_, role) => (
        <Space>
          <Tooltip title='Матрица прав'>
            <Button
              size='small'
              icon={<SettingOutlined />}
              onClick={() => setPermissionsRoleId(role.id)}
            >
              Права
            </Button>
          </Tooltip>
          {isEditor && (
            <Tooltip title='Редактировать'>
              <Button
                size='small'
                icon={<EditOutlined />}
                onClick={() => setEditingRole(role)}
              />
            </Tooltip>
          )}
          {isDeleter && !role.is_system && (
            <Popconfirm
              title='Удалить роль?'
              description={`Все назначения роли «${role.name}» будут удалены.`}
              onConfirm={() => handleDelete(role)}
              okText='Удалить'
              cancelText='Отмена'
              okButtonProps={{ danger: true }}
            >
              <Button size='small' icon={<DeleteOutlined />} danger />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Input.Search
            placeholder='Поиск по названию или коду'
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 320 }}
          />
        </Space>
        {isEditor && (
          <Button
            type='primary'
            icon={<PlusOutlined />}
            onClick={() => setCreatingRole(true)}
          >
            Новая роль
          </Button>
        )}
      </Space>

      <Alert
        type='info'
        showIcon
        message='Права применяются у пользователей сразу.'
        description='После изменения матрицы прав у всех клиентов автоматически перевыпускается JWT с актуальным снимком прав при следующем запросе.'
        style={{ marginBottom: 16 }}
      />

      <Table<AdminRole>
        rowKey='id'
        loading={isLoading}
        dataSource={filteredRoles}
        columns={columns}
        pagination={{ pageSize: 50 }}
      />

      {editingRole && (
        <RoleEditDrawer
          open
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSubmit={(payload) => {
            updateMut.mutate(
              { id: editingRole.id, payload },
              {
                onSuccess: () => {
                  message.success('Роль обновлена');
                  setEditingRole(null);
                },
                onError: () => message.error('Не удалось обновить роль'),
              },
            );
          }}
          isSubmitting={updateMut.isPending}
        />
      )}

      <RoleEditDrawer
        open={creatingRole}
        role={null}
        onClose={() => setCreatingRole(false)}
        onSubmit={(payload) => {
          createMut.mutate(payload, {
            onSuccess: () => {
              message.success('Роль создана');
              setCreatingRole(false);
            },
            onError: (err) => {
              const msg = err instanceof Error ? err.message : 'Не удалось создать роль';
              message.error(msg);
            },
          });
        }}
        isSubmitting={createMut.isPending}
      />

      <Drawer
        title={`Права роли`}
        placement='right'
        width={920}
        open={!!permissionsRoleId}
        onClose={() => setPermissionsRoleId(null)}
        destroyOnHidden
      >
        {permissionsRoleId && (
          <RolePermissionsMatrix
            roleId={permissionsRoleId}
            readOnly={!isEditor}
            onSaved={() => message.success('Права обновлены')}
          />
        )}
      </Drawer>
    </div>
  );
}

