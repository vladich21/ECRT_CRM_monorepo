import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { Layout, Menu, theme } from 'antd';
import ProfileButton from '../components/profileButton/ProfileButton';
import useAuthStore from '../store/AuthStore';
import { items } from './data';
import styles from './styles.module.scss';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children?: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const getSelectedKeys = () => {
    const path = pathname.split('/')[1] || '/';
    return [path === '' ? '/' : path];
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <img src='/logo_min.png' alt='Логотип' />
        </div>

        <Menu
          theme='dark'
          mode='horizontal'
          selectedKeys={getSelectedKeys()}
          items={items}
          className={styles.menu}
        />

        <div className={styles.profileSection}>
          <ProfileButton
            name={`${user?.first_name} ${user?.last_name}`}
            collapsed={false}
            onClick={() => navigate('/profile')}
          />
        </div>
      </Header>

      <Content
        className={styles.content}
        style={{
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}
      >
        {children ?? <Outlet />}
      </Content>
    </Layout>
  );
}

export default MainLayout;
