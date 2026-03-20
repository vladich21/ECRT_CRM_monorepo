import { Tag } from 'antd';
import { RightOutlined, MailOutlined } from '@ant-design/icons';
import type { User } from '../../../types/user';
import styles from './UserCard.module.scss';

interface UserCardProps {
  user: User;
  onClick: (user: User) => void;
}

function getFio(user: User): string {
  return [user.last_name, user.first_name, user.middle_name].filter(Boolean).join(' ').trim() || '—';
}

export default function UserCard({ user, onClick }: UserCardProps) {
  const statusColor = user.is_active ? '#52c41a' : '#8c8c8c';
  const statusLabel = user.is_active ? 'Активный' : 'Неактивный';
  const roleNames = user.roles?.map(r => r.role_name || r.id).filter(Boolean) ?? [];

  return (
    <div
      className={styles.card}
      style={{ '--status-color': statusColor } as React.CSSProperties}
      onClick={() => onClick(user)}
    >
      <div className={styles.mainInfo}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{getFio(user)}</span>
          <span className={styles.metaInn}>
            <MailOutlined style={{ fontSize: 11, marginRight: 4 }} />
            {user.email || '—'}
          </span>
        </div>
        <div className={styles.metaRow}>
          <Tag color={statusColor} style={{ fontSize: 14 }}>{statusLabel}</Tag>
        </div>
        <div className={styles.metaRow}>
          {user.department?.name && <span>{user.department.name}</span>}
          {user.department?.name && user.position?.name && <span className={styles.metaDot}>•</span>}
          {user.position?.name && <span>{user.position.name}</span>}
        </div>
        {roleNames.length > 0 && (
          <div className={styles.tagsRow}>
            {roleNames.map((name, i) => (
              <span key={i} className={styles.tag}>{name}</span>
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
