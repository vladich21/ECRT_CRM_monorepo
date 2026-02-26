import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { userApi } from './userApi';
import { User } from '../../types/user';

export const useUsers = (preview = 2, full = false): UseQueryResult<User[], Error> => {
  return useQuery<User[], Error>({
    queryKey: ['users', preview, full],
    queryFn: () => userApi.getUsers(preview, full),
  });
};

export const useUserById = (userId: string | undefined): UseQueryResult<User, Error> => {
  return useQuery<User, Error>({
    queryKey: ['users', userId],
    queryFn: () => userApi.getUserById(userId!),
    enabled: !!userId,
  });
};

export const useCreateUser = (): UseMutationResult<User, Error, User> => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, User>({
    mutationFn: (data: User) => userApi.addUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'users');
        },
      });
    },
  });
};

export const useUpdateUser = (): UseMutationResult<User, Error, { id: string; data: Partial<User> }> => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { id: string; data: Partial<User> }>({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => {
      return userApi.editUser(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        predicate: query => {
          return query.queryKey.some(key => typeof key === 'string' && key === 'users');
        },
      });
    },
  });
};
