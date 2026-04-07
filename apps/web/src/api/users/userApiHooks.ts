import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { User } from '../../types/user';
import { userApi } from './userApi';
import { userQueryKeys } from './userQueryKeys';

type UpdateUserInput = {
  id: string;
  data: Partial<User>;
};

export function useUsers(preview = 2, full = true) {
  return useQuery({
    queryKey: userQueryKeys.fullList(preview, full),
    queryFn: () => userApi.getUsers(preview, full),
  });
}

export function useUserById(userId: string) {
  return useQuery({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => userApi.getUserById(userId!),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: User) => userApi.addUser(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateUserInput) => userApi.editUser(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}

