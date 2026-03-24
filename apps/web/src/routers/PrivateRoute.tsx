import { ReactNode } from "react";

import { Navigate } from "react-router-dom";

import useAuthStore from "../store/AuthStore";


const PrivateRoute = ({ children }: { children: ReactNode }) => {
  const isAuth = useAuthStore((state) => state.isAuth);

  return isAuth ? children : <Navigate to='/auth' replace />;
};

export default PrivateRoute;
