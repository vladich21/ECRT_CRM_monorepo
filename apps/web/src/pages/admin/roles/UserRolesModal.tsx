import { useEffect, useState } from 'react';
import { Modal, Select, Spin, message } from 'antd';

import {
  useAdminRolesList,
  useAssignUserRoles,
  useUserRoles,
} from '../../../api/adminRbac/adminRbacApiHooks';

interface Props {
  open: boolean;
  userId: string | null;
  userLabel?: string;
  onClose: () => void;
}

export function UserRolesModal({ open, userId, userLabel, onClose }: Props) {
  const { data: roles = [], isLoading: rolesLoading } = useAdminRolesList();
  const { data: userRoles, isLoading: userLoading } = useUserRoles(open ? userId : null);
  const assignMut = useAssignUserRoles();

  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (userRoles) setSelectedRoleIds(userRoles.role_ids);
  }, [userRoles]);

  useEffect(() => {
    if (!open) setSelectedRoleIds([]);
  }, [open]);

  const handleSubmit = () => {
    if (!userId) return;
    assignMut.mutate(
      { userId, roleIds: selectedRoleIds },
      {
        onSuccess: () => {
          message.success('Роли обновлены');
          onClose();
        },
        onError: () => message.error('Не удалось обновить роли'),
      },
    );
  };

  return (
    <Modal
      title={`Роли пользователя${userLabel ? ` «${userLabel}»` : ''}`}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText='Сохранить'
      cancelText='Отмена'
      okButtonProps={{ loading: assignMut.isPending }}
      destroyOnHidden
    >
      {(rolesLoading || userLoading) ? (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Spin />
        </div>
      ) : (
        <Select
          mode='multiple'
          style={{ width: '100%' }}
          value={selectedRoleIds}
          onChange={setSelectedRoleIds}
          placeholder='Выберите роли'
          options={roles
            .filter((r) => r.is_active)
            .map((r) => ({
              label: r.name + (r.is_system ? ' (системная)' : ''),
              value: r.id,
            }))}
          optionFilterProp='label'
          showSearch
        />
      )}
    </Modal>
  );
}
