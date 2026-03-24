import { EditOutlined, IdcardOutlined, MailOutlined, PhoneOutlined, TeamOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';

import { useUserById } from '../../../api/users/userApiHooks';
import { Loader } from '../../../components/loader/Loader';
import { NotFound } from '../../../components/notFound/NotFound';
import DetailPageHeader, { detailPageHeaderStyles as hStyles } from '../../../components/pageLayout/DetailPageHeader';
import { useNotification } from '../../../customhooks/useNotification';
import styles from './UserDetails.module.scss';

export default function UserDetailsPage() {
  const params = useParams();
  const userId = params?.userId as string | undefined;
  const navigate = useNavigate();
  const { contextHolder } = useNotification();
  const { data: user, isLoading, isError } = useUserById(userId!);

  const handleEdit = () => navigate(`/users/${userId}/edit`);

  if (isLoading) return <Loader />;
  if (isError || !user) return <NotFound errorMessage='Пользователь не найден' />;

  const fullName = `${user.last_name || ''} ${user.first_name || ''} ${user.middle_name || ''}`.trim();

  return (
    <DetailPageHeader
      title={fullName || 'Пользователь'}
      backLabel='Пользователи'
      onBack={() => navigate('/users')}
      statusBadge={{
        label: user.is_active ? 'Активен' : 'Не активен',
        color: user.is_active ? '#52c41a' : '#ff4d4f',
      }}
      metaItems={[
        user.email && (
          <span key='email' className={hStyles.metaText}>
            <MailOutlined /> {user.email}
          </span>
        ),
        user.department?.name && (
          <span key='dept' className={hStyles.metaText}>
            <TeamOutlined /> {user.department.name}
          </span>
        ),
        user.position?.name && (
          <span key='pos' className={hStyles.metaText}>
            <IdcardOutlined /> {user.position.name}
          </span>
        ),
      ].filter(Boolean)}
      actions={
        <Button type='primary' icon={<EditOutlined />} onClick={handleEdit}>
          Редактировать
        </Button>
      }
      tabs={[{ key: 'main', label: 'Основное' }]}
      activeTab='main'
      onTabChange={() => {}}
      contextHolder={contextHolder}
    >
      <div className={styles.layout}>
        <div className={styles.leftColumn}>
          {/* Основная информация */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Основная информация</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Фамилия</span>
                <span className={user.last_name ? styles.infoValue : styles.infoValueMuted}>
                  {user.last_name || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Имя</span>
                <span className={user.first_name ? styles.infoValue : styles.infoValueMuted}>
                  {user.first_name || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Отчество</span>
                <span className={user.middle_name ? styles.infoValue : styles.infoValueMuted}>
                  {user.middle_name || 'Не указано'}
                </span>
              </div>
            </div>
          </div>

          {/* Контактная информация */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Контактная информация</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Email</span>
                <span className={user.email ? styles.infoValue : styles.infoValueMuted}>
                  {user.email || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Телефон</span>
                <span className={user.phone ? styles.infoValue : styles.infoValueMuted}>
                  {user.phone || 'Не указано'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Организация</h3>
            <div className={styles.infoRows}>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Отдел</span>
                <span className={user.department?.name ? styles.infoValue : styles.infoValueMuted}>
                  {user.department?.name || 'Не указано'}
                </span>
              </div>
              <div className={styles.infoRow}>
                <span className={styles.infoLabel}>Должность</span>
                <span className={user.position?.name ? styles.infoValue : styles.infoValueMuted}>
                  {user.position?.name || 'Не указано'}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Роли</h3>
            {user.roles?.length > 0 ? (
              <div className={styles.rolesWrap}>
                {user.roles.map(role => (
                  <span key={role.id} className={styles.roleTag}>
                    {role.role_name}
                  </span>
                ))}
              </div>
            ) : (
              <span className={styles.infoValueMuted} style={{ fontSize: 13 }}>
                Роли не назначены
              </span>
            )}
          </div>
        </div>
      </div>
    </DetailPageHeader>
  );
}
