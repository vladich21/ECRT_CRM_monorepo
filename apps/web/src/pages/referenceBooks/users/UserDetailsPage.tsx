import { useState } from 'react';
import { SettingOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useUserById } from '@/api/users/userApiHooks';
import { Loader } from '@/components/loader/Loader';
import { NotFound } from '@/components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '@/components/pageLayout/DetailPageHeader';
import pi from '@/components/pageLayout/profileInfoCards.module.scss';
import { UserProfileBody } from '@/components/userProfile/UserProfileBody';
import { userHeaderRoleChips } from '@/components/userProfile/userHeaderRoleChips';
import { useNotification } from '@/hooks/notifications/useNotification';
import { usePermissions } from '@/hooks/usePermissions';
import { SECTIONS } from '@/shared/permissions';
import { UserRolesModal } from '../../admin/roles/UserRolesModal';
import type { User } from '@/types/user';

function headerSubtitle(user: User): string | undefined {
  const parts = [user.position?.name, user.department?.name].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const navigate = useNavigate();
  const { contextHolder } = useNotification();
  const { data: user, isLoading, isError } = useUserById(userId!);
  const { canEdit } = usePermissions();
  const canEditRoles = canEdit(SECTIONS.ADMIN_USERS);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  if (isLoading) return <Loader />;
  if (isError || !user) return <NotFound errorMessage='Пользователь не найден' />;

  const fullName = `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim();

  return (
    <DetailPageHeader
      title={fullName || 'Пользователь'}
      subtitle={headerSubtitle(user)}
      actions={
        canEditRoles ? (
          <Button
            icon={<SettingOutlined />}
            onClick={() => setRolesModalOpen(true)}
          >
            Роли
          </Button>
        ) : undefined
      }
      lead={
        <Avatar
          key='user-avatar'
          size={100}
          src={user.avatar_url || undefined}
          icon={!user.avatar_url ? <UserOutlined /> : undefined}
          className={hStyles.heroAvatar}
        />
      }
      backLabel='Пользователи'
      onBack={() => navigate('/users')}
      statusBadge={{
        label: user.is_active ? 'Активен' : 'Не активен',
        variant: user.is_active ? 'activityActive' : 'activityInactive',
      }}
      metaExtra={
        userHeaderRoleChips(user) ?? (
          <span className={hStyles.headerRolesEmpty}>Роли не назначены</span>
        )
      }
      tabs={[{ key: 'main', label: 'Основное' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      <UserProfileBody user={user} shellClassName={pi.shellInDetail} />
      <UserRolesModal
        open={rolesModalOpen}
        userId={user.id}
        userLabel={fullName}
        onClose={() => setRolesModalOpen(false)}
      />
    </DetailPageHeader>
  );
}
