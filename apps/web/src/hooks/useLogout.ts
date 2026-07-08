import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

import { authApi } from '@/api/auth/authApi';
import useAuthStore from '@/store/AuthStore';

export const UseLogout = () => {
  const { logout: storeLogout } = useAuthStore(state => state);
  const navigate = useNavigate();

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      /* выходим локально даже если сеть недоступна */
    }
    storeLogout();
    Cookies.remove('token');
    localStorage.removeItem('auth-storage');
    navigate('/auth', { replace: true });
  };

  return {
    logout,
  };
};
