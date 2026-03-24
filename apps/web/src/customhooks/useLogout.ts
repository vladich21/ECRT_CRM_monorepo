import Cookies from 'js-cookie';
import { useNavigate } from 'react-router-dom';

import useAuthStore from '../store/AuthStore';

export const UseLogout = () => {
  const { logout: storeLogout } = useAuthStore(state => state);
  const navigate = useNavigate();

  const logout = () => {
    storeLogout();
    Cookies.remove('token');
    localStorage.removeItem('auth-storage');
    navigate('/auth', { replace: true });
  };

  return {
    logout,
  };
};
