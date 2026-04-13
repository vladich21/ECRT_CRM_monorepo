import { UserOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';

import styles from './styles.module.scss';

interface IProfileButton {
  name: string;
  /** Абсолютный URL аватара (после синка HR / из API пользователя) */
  avatarUrl?: string | null;
  collapsed: boolean;
  onClick: () => void | Promise<void>;
}

const ProfileButton = ({ name = 'Пользователь', avatarUrl, collapsed, onClick }: IProfileButton) => {
  const hasPhoto = Boolean(avatarUrl?.trim());
  return (
    <div className={`${styles['profile-btn']} ${collapsed ? styles.collapsed : styles.expanded}`} onClick={onClick}>
      <Avatar
        className={`${styles.avatar} ${collapsed ? styles.collapsed : styles.expanded}`}
        size={40}
        src={hasPhoto ? avatarUrl! : undefined}
        icon={!hasPhoto ? <UserOutlined /> : undefined}
      />

      <span className={`${styles.name} ${collapsed ? styles.collapsed : styles.expanded}`} title={name}>
        {name}
      </span>
    </div>
  );
};

export default ProfileButton;
