import { useQuery } from '@tanstack/react-query';
import useAuthStore from '../store/AuthStore';
import { userApi } from '../api/users/userApi';

/** Id пользователя в SRM. Portal и SRM — разные системы, ищем по email. */
export const useCurrentSrmUserId = (): string | undefined => {
  const { user } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['srm-user', user?.email],
    queryFn: () => userApi.getUserByEmail(user!.email),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });
  return data?.id ?? user?.id;
};
