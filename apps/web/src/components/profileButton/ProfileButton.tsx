import { Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import styles from "./styles.module.scss";

interface IProfileButton {
  name: string
  collapsed: boolean
  onClick: () => void | Promise<void>
}

const ProfileButton = ({ name = "Пользователь", collapsed, onClick }: IProfileButton) => {
  return (
    <div
      className={`${styles['profile-btn']} ${collapsed ? styles.collapsed : styles.expanded}`}
      onClick={onClick}
    >
      <Avatar
        className={`${styles.avatar} ${collapsed ? styles.collapsed : styles.expanded}`}
        size={30}
        icon={<UserOutlined />}
      />

      <span className={`${styles.name} ${collapsed ? styles.collapsed : styles.expanded}`}>
        {name}
      </span>
    </div>
  );
};

// Добавляем пропс по умолчанию
ProfileButton.defaultProps = {
  onClick: () => {},
  user: {
    name: "Пользователь",
    avatarColor: "#fde3cf",
    textColor: "#ffffff",
  },
};
export default ProfileButton;
