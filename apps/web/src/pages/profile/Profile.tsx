import { useEffect, useState } from 'react';
import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { App, Avatar, Button } from 'antd';

import { refreshSessionUser } from '../../api/auth/refreshSessionUser';
import { Loader } from '../../components/loader/Loader';
import pi from '../../components/pageLayout/profileInfoCards.module.scss';
import { UserProfileBody } from '../../components/userProfile/UserProfileBody';
import { userHeaderRoleChips } from '../../components/userProfile/userHeaderRoleChips';
import { UseLogout } from '../../customhooks/useLogout';
import { useNotification } from '../../customhooks/useNotification';
import useAuthStore from '../../store/AuthStore';
import styles from './Profile.module.scss';

const ProfilePage = () => {
  const { modal } = App.useApp();
  const { user } = useAuthStore(state => state);
  const { logout } = UseLogout();
  const { contextHolder } = useNotification();
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshSessionUser();
      } catch {
        /* остаёмся на данных из persist */
      } finally {
        if (!cancelled) setProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profileReady) return <Loader />;

  if (!user) {
    logout();
    return null;
  }

  const fullName = `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim();
  const headerContext = [user.position?.name, user.department?.name].filter(Boolean).join(' · ');

  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.avatarWrap}>
            <Avatar
              size={100}
              src={user.avatar_url || undefined}
              icon={!user.avatar_url ? <UserOutlined /> : undefined}
              className={styles.avatar}
              style={user.avatar_url ? undefined : { backgroundColor: '#fde3cf', color: '#f56a00' }}
            />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.userName}>{fullName}</h1>
            {headerContext ? <p className={styles.headerContext}>{headerContext}</p> : null}
            <div className={styles.headerBadges}>
              <span className={user.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                {user.is_active ? 'Активен' : 'Неактивен'}
              </span>
              <div className={styles.headerRolesGroup}>
                {userHeaderRoleChips(user) ?? (
                  <span className={styles.headerRolesEmpty}>Роли не назначены</span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button
              type='primary'
              danger
              icon={<LogoutOutlined />}
              onClick={() =>
                modal.confirm({
                  title: 'Выход из системы',
                  content: 'Вы точно хотите выйти?',
                  okText: 'Выйти',
                  cancelText: 'Отмена',
                  okButtonProps: { danger: true },
                  onOk: logout,
                })
              }
            >
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <UserProfileBody user={user} shellClassName={pi.shell} />
    </div>
  );
};
export default ProfilePage;
