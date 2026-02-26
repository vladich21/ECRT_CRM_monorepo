import { useMutation } from '@tanstack/react-query';

import Cookies from 'js-cookie';
import useAuthStore from '../../store/AuthStore';
import { authApi } from './authApi';

export const useLogin = () => {
  const { login } = useAuthStore();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: data => {
      if (data?.JWT && data.data?.length) {
        Cookies.set('token', data.JWT);
        login(data?.data[0], data.JWT);
      }
    },
  });
};
