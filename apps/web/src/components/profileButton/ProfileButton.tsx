import { UserOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';

import styles from './styles.module.scss';

interface IProfileButton {
  name: string;
  /** Абсолютный URL аватара (после синка HR / из API пользователя) */
  avatarUrl?: string | null;
  onClick: () => void | Promise<void>;
}

const ProfileButton = ({ name = 'Пользователь', avatarUrl, onClick }: IProfileButton) => {
  const hasPhoto = Boolean(avatarUrl?.trim());
  return (
    <button
      type='button'
      className={styles.profileBtn}
      onClick={onClick}
      aria-label={`Профиль: ${name}`}
      title={name}
    >
      <Avatar
        className={styles.avatar}
        size={40}
        src={hasPhoto ? avatarUrl! : undefined}
        icon={!hasPhoto ? <UserOutlined /> : undefined}
      />
    </button>
  );
};

export default ProfileButton;
