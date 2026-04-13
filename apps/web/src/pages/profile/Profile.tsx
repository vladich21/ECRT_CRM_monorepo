import { useEffect, useState } from 'react';
import { CameraOutlined, LogoutOutlined, MailOutlined, PhoneOutlined, UserOutlined } from '@ant-design/icons';
import { App, Avatar, Button } from 'antd';

import { refreshSessionUser } from '../../api/auth/refreshSessionUser';
import { Loader } from '../../components/loader/Loader';
import { UseLogout } from '../../customhooks/useLogout';
import { useNotification } from '../../customhooks/useNotification';
import useAuthStore from '../../store/AuthStore';
import styles from './Profile.module.scss';

const ProfilePage = () => {
  const { modal } = App.useApp();
  const { user } = useAuthStore(state => state);
  const { logout } = UseLogout();
  const { showNotification, contextHolder } = useNotification();
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
  return (
    <div className={styles.pageRoot}>
      {contextHolder}

      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.avatarWrap}>
            <Avatar
              size={96}
              src={user.avatar_url || undefined}
              icon={!user.avatar_url ? <UserOutlined /> : undefined}
              className={styles.avatar}
              style={user.avatar_url ? undefined : { backgroundColor: '#fde3cf', color: '#f56a00' }}
            />
            <button
              type='button'
              className={styles.photoUploadBtn}
              onClick={() => showNotification('info', 'Фото', 'Загрузка фото (в разработке)')}
              aria-label='Изменить фото'
            >
              <CameraOutlined />
            </button>
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.userName}>{fullName}</h1>
            <div>
              {user.roles?.map(role => (
                <span
                  key={role.id}
                  className={role.role_name === 'admin' ? styles.roleTagAdmin : styles.roleTagDefault}
                >
                  {role.role_name}
                </span>
              ))}
              <span className={user.is_active ? styles.statusBadgeActive : styles.statusBadgeInactive}>
                {user.is_active ? 'Активен' : 'Неактивен'}
              </span>
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

      <div className={styles.contentWrap}>
        <div className={styles.layout}>
          <div className={styles.leftColumn}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Организация</h3>
              <div className={styles.infoRows}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Должность</span>
                  <span className={user.position?.name ? styles.infoValue : styles.infoValueMuted}>
                    {user.position?.name || 'Не указано'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Отдел</span>
                  <span className={user.department?.name ? styles.infoValue : styles.infoValueMuted}>
                    {user.department?.name || 'Не указано'}
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Контактная информация</h3>
              <div className={styles.infoRows}>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Email</span>
                  {user.email ? (
                    <a href={`mailto:${user.email}`} className={styles.infoLink}>
                      <MailOutlined /> {user.email}
                    </a>
                  ) : (
                    <span className={styles.infoValueMuted}>Не указано</span>
                  )}
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Телефон</span>
                  {user.phone ? (
                    <a href={`tel:${user.phone.replace(/\D/g, '')}`} className={styles.infoLink}>
                      <PhoneOutlined /> {user.phone}
                    </a>
                  ) : (
                    <span className={styles.infoValueMuted}>Не указано</span>
                  )}
                </div>
                {user.internal_phone != null && user.internal_phone !== '' && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Внутренний телефон</span>
                    <span className={styles.infoValue}>{user.internal_phone}</span>
                  </div>
                )}
              </div>
            </div>
            {(user.personnel_number ||
              user.hired_at ||
              user.quit_date ||
              user.supervisor?.name) && (
              <div className={styles.card}>
                <h3 className={styles.cardTitle}>Данные из HR</h3>
                <div className={styles.infoRows}>
                  {user.personnel_number != null && user.personnel_number !== '' && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Табельный номер</span>
                      <span className={styles.infoValue}>{user.personnel_number}</span>
                    </div>
                  )}
                  {user.hired_at != null && user.hired_at !== '' && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Дата приёма</span>
                      <span className={styles.infoValue}>{user.hired_at}</span>
                    </div>
                  )}
                  {user.quit_date != null && user.quit_date !== '' && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Дата увольнения</span>
                      <span className={styles.infoValue}>{user.quit_date}</span>
                    </div>
                  )}
                  {user.supervisor?.name != null && user.supervisor.name !== '' && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Руководитель</span>
                      <span className={styles.infoValue}>
                        {user.supervisor.name}
                        {user.supervisor.email ? ` (${user.supervisor.email})` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className={styles.sidebar} />
        </div>
      </div>
    </div>
  );
};
export default ProfilePage;
