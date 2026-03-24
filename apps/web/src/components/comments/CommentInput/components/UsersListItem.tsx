import { memo } from 'react';
import { UserOutlined } from '@ant-design/icons';
import { Avatar } from 'antd';

import { Reference } from '../../../../types/referenceTypes';
import styles from './UsersListItem.module.scss';

interface UserListItemProps {
  user: Reference;
  index: number;
  isSelected: boolean;
  onSelect: (user: Reference) => void;
  onMouseEnter: (index: number) => void;
  setItemRef: (index: number, element: HTMLDivElement | null) => void;
}

export const UserListItem = memo<UserListItemProps>(
  ({ user, index, isSelected, onSelect, onMouseEnter, setItemRef }) => {
    return (
      <div
        ref={el => setItemRef(index, el)}
        className={`${styles.userItem} ${isSelected ? styles.selected : ''}`}
        onClick={() => onSelect(user)}
        onMouseEnter={() => onMouseEnter(index)}
      >
        <Avatar size='small' icon={<UserOutlined />} />
        <span className={styles.userName}>{user.name}</span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.user.id === nextProps.user.id && prevProps.isSelected === nextProps.isSelected;
  },
);

UserListItem.displayName = 'UserListItem';
