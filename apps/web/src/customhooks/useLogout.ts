import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/AuthStore';
import Cookies from 'js-cookie';

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
