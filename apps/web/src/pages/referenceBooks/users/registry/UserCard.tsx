import { MailOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Tag } from 'antd';

import { getActiveInactiveSurface, mutedTagStyle } from '../../../../constants/statusBadgeSurfaces';
import type { User } from '../../../../types/user';
import styles from './UserCard.module.scss';

interface UserCardProps {
  user: User;
  onClick: (user: User) => void;
}
function getFio(user: User): string {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim() || '—';
}
export default function UserCard({ user, onClick }: UserCardProps) {
  const statusLabel = user.is_active ? 'Активный' : 'Неактивный';
  const statusSurface = getActiveInactiveSurface(user.is_active);
  const roleNames = user.roles?.map(r => r.role_name || r.id).filter(Boolean) ?? [];
  return (
    <div
      className={styles.card}
      {...(!user.is_active ? { 'data-danger-stripe': true as const } : {})}
      onClick={() => onClick(user)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <Avatar
            size={40}
            src={user.avatar_url || undefined}
            icon={!user.avatar_url ? <UserOutlined /> : undefined}
            style={{ flexShrink: 0 }}
          />
          <span className={styles.name}>{getFio(user)}</span>
          <span className={styles.metaInn}>
            <MailOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {user.email || '—'}
          </span>
        </div>
        <div className={styles.metaRow}>
          <Tag bordered={false} style={mutedTagStyle(statusSurface, { fontSize: 14 })}>
            {statusLabel}
          </Tag>
        </div>
        <div className={styles.metaRow}>
          {user.department?.name && <span>{user.department.name}</span>}
          {user.department?.name && user.position?.name && <span className={styles.metaDot}>•</span>}
          {user.position?.name && <span>{user.position.name}</span>}
        </div>
        {roleNames.length > 0 && (
          <div className={styles.tagsRow}>
            {roleNames.map((name, i) => (
              <span key={i} className={styles.tag}>
                {name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.activityCol}>
        <RightOutlined className={styles.arrow} />
      </div>
    </div>
  );
}
