import { ReactNode, Suspense, useEffect, useMemo } from 'react';
import { Layout, Menu, theme } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { refreshSessionUser } from '../api/auth/refreshSessionUser';
import ecrtLogoMin from '../assets/svg/ecrt-logo-min.svg';
import { Loader } from '../components/loader/Loader';
import ProfileButton from '../components/profileButton/ProfileButton';
import { usePermissions } from '../hooks/usePermissions';
import useAuthStore from '../store/AuthStore';
import { buildMenuItems } from './data';
import styles from './styles.module.scss';

const { Header, Content } = Layout;

interface MainLayoutProps {
  children?: ReactNode;
}

function MainLayout({ children }: MainLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isAuth = useAuthStore(state => state.isAuth);
  const user = useAuthStore(state => state.user);
  const { hasAnySectionPermission } = usePermissions();
  const menuItems = useMemo(
    () => buildMenuItems(sections => hasAnySectionPermission(sections, 'read')),
    [hasAnySectionPermission],
  );
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (!isAuth) return;
    void refreshSessionUser().catch(() => {});
  }, [isAuth]);

  const getSelectedKeys = () => {
    const path = pathname.split('/')[1] || '/';
    return [path === '' ? '/' : path];
  };

  return (
    <Layout className={styles.layout}>
      <Header className={styles.header}>
        <div className={styles.logo}>
          <button type='button' className={styles.logoButton} onClick={() => navigate('/home')} aria-label='Перейти на главную'>
            <img src={ecrtLogoMin} alt='Логотип' />
          </button>
        </div>

        <Menu
          theme='dark'
          mode='horizontal'
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          className={styles.menu}
        />

        <div className={styles.profileSection}>
          <ProfileButton
            name={
              [user?.last_name, user?.first_name, user?.middle_name].filter(Boolean).join(' ').trim() ||
              'Пользователь'
            }
            avatarUrl={user?.avatar_url}
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
        <div className={styles.contentInner}>
          <Suspense fallback={<Loader />}>{children ?? <Outlet />}</Suspense>
        </div>
      </Content>
    </Layout>
  );
}

export default MainLayout;
