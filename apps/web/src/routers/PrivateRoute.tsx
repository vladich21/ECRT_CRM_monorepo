import { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';

import { Loader } from '../components/loader/Loader';
import useAuthStore from '../store/AuthStore';

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const hasHydrated = useAuthStore(state => state.hasHydrated);
  const isAuth = useAuthStore(state => state.isAuth);

  if (!hasHydrated) {
    return <Loader />;
  }

  return isAuth ? children : <Navigate to='/auth' replace />;
};

export default PrivateRoute;
