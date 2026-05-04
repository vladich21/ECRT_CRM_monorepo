import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Checkbox, Space, Spin, Table, Tag, Typography, message } from 'antd';
import type { ColumnType } from 'antd/es/table';

import {
  useAdminRolePermissions,
  useUpdateRolePermissions,
} from '../../../api/adminRbac/adminRbacApiHooks';
import type {
  RolePermissionFlags,
  RoleSectionWithPermissions,
} from '../../../api/adminRbac/adminRbacApi';

interface Props {
  roleId: string;
  readOnly: boolean;
  onSaved?: () => void;
}

interface MatrixRow extends RoleSectionWithPermissions {
  level: number;
}

const EMPTY_FLAGS: RolePermissionFlags = { canRead: false, canEdit: false, canDelete: false };

/**
 * Из плоского списка с parent_id строим иерархию (папка → её дети) и
 * сразу разворачиваем в плоскость для Table.dataSource, чтобы можно было
 * показывать вложенность через отступы level.
 */
function flattenWithLevel(sections: RoleSectionWithPermissions[]): MatrixRow[] {
  const childrenByParent = new Map<string | null, RoleSectionWithPermissions[]>();
  for (const s of sections) {
    const list = childrenByParent.get(s.parent_id) ?? [];
    list.push(s);
    childrenByParent.set(s.parent_id, list);
  }
  childrenByParent.forEach((list) => {
    list.sort((a: RoleSectionWithPermissions, b: RoleSectionWithPermissions) => a.sort_order - b.sort_order);
  });

  const out: MatrixRow[] = [];
  const walk = (parent: string | null, level: number) => {
    const items = childrenByParent.get(parent) ?? [];
    for (const item of items) {
      out.push({ ...item, level });
      walk(item.id, level + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function RolePermissionsMatrix({ roleId, readOnly, onSaved }: Props) {
  const { data, isLoading, isError } = useAdminRolePermissions(roleId);
  const updateMut = useUpdateRolePermissions();

  // Локальное состояние матрицы — копируется из data при загрузке.
  const [draft, setDraft] = useState<Record<string, RolePermissionFlags>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!data) return;
    const initial: Record<string, RolePermissionFlags> = {};
    for (const s of data.sections) {
      if (!s.is_folder) {
        initial[s.code] = s.permissions ?? { ...EMPTY_FLAGS };
      }
    }
    setDraft(initial);
    setHasChanges(false);
  }, [data]);

  const rows = useMemo(() => (data ? flattenWithLevel(data.sections) : []), [data]);

  const setFlag = (code: string, action: keyof RolePermissionFlags, value: boolean) => {
    setDraft((prev) => {
      const cur = prev[code] ?? { ...EMPTY_FLAGS };
      const next: RolePermissionFlags = { ...cur, [action]: value };
      // Поднимаем зависимости: edit→read, delete→edit→read
      if (action === 'canDelete' && value) {
        next.canEdit = true;
        next.canRead = true;
      }
      if (action === 'canEdit' && value) next.canRead = true;
      // Снижаем при снятии: read=false → edit=false → delete=false
      if (action === 'canRead' && !value) {
        next.canEdit = false;
        next.canDelete = false;
      }
      if (action === 'canEdit' && !value) next.canDelete = false;
      setHasChanges(true);
      return { ...prev, [code]: next };
    });
  };

  const handleSave = () => {
    // На бэк отправляем только записи где есть хотя бы один флаг
    const cleaned: Record<string, RolePermissionFlags> = {};
    for (const [code, flags] of Object.entries(draft)) {
      if (flags.canRead || flags.canEdit || flags.canDelete) {
        cleaned[code] = flags;
      }
    }
    // Также передаём пустые объекты (canRead=false) для отзыва прав;
    // однако backend пропускает {false,false,false} — для этого нам нужно
    // явно передать список и без флагов: пройдёмся по всем известным разделам.
    const payload: Record<string, RolePermissionFlags> = {};
    for (const code of Object.keys(draft)) {
      payload[code] = draft[code];
    }
    updateMut.mutate(
      { roleId, permissions: payload },
      {
        onSuccess: () => {
          setHasChanges(false);
          onSaved?.();
        },
        onError: () => message.error('Не удалось сохранить права'),
      },
    );
  };

  if (isLoading) return <Spin />;
  if (isError || !data) return <Alert type='error' message='Не удалось загрузить права роли' />;

  const columns: ColumnType<MatrixRow>[] = [
    {
      title: 'Раздел',
      dataIndex: 'name',
      width: 380,
      render: (name: string, row) => (
        <span style={{ paddingLeft: row.level * 20 }}>
          {row.is_folder ? <Typography.Text type='secondary'>{name}</Typography.Text> : name}
          {row.is_folder && (
            <Tag color='default' style={{ marginLeft: 8 }}>
              группа
            </Tag>
          )}
          <Typography.Text type='secondary' style={{ marginLeft: 8, fontSize: 11 }}>
            {row.code}
          </Typography.Text>
        </span>
      ),
    },
    {
      title: 'Чтение',
      key: 'read',
      width: 90,
      align: 'center',
      render: (_, row) => row.is_folder ? null : (
        <Checkbox
          checked={draft[row.code]?.canRead ?? false}
          disabled={readOnly}
          onChange={(e) => setFlag(row.code, 'canRead', e.target.checked)}
        />
      ),
    },
    {
      title: 'Редактирование',
      key: 'edit',
      width: 130,
      align: 'center',
      render: (_, row) => row.is_folder ? null : (
        <Checkbox
          checked={draft[row.code]?.canEdit ?? false}
          disabled={readOnly}
          onChange={(e) => setFlag(row.code, 'canEdit', e.target.checked)}
        />
      ),
    },
    {
      title: 'Удаление',
      key: 'delete',
      width: 100,
      align: 'center',
      render: (_, row) => row.is_folder ? null : (
        <Checkbox
          checked={draft[row.code]?.canDelete ?? false}
          disabled={readOnly}
          onChange={(e) => setFlag(row.code, 'canDelete', e.target.checked)}
        />
      ),
    },
  ];

  return (
    <Space direction='vertical' style={{ width: '100%' }} size={12}>
      <Alert
        type='info'
        showIcon
        message='Зависимости прав'
        description='Удаление включает редактирование, редактирование включает чтение. При снятии чтения автоматически снимаются и остальные.'
      />
      <Table<MatrixRow>
        rowKey='id'
        size='small'
        dataSource={rows}
        columns={columns}
        pagination={false}
        scroll={{ y: 'calc(100vh - 320px)' }}
      />
      {!readOnly && (
        <Space style={{ justifyContent: 'flex-end', width: '100%' }}>
          <Button
            type='primary'
            disabled={!hasChanges}
            loading={updateMut.isPending}
            onClick={handleSave}
          >
            Сохранить изменения
          </Button>
        </Space>
      )}
    </Space>
  );
}
