import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from './userApi';
import { User } from '../../types/user';
type UpdateUserInput = {
  id: string;
  data: Partial<User>;
};
const usersQueryKey = ['users'] as const;

export function useUsers(preview = 2, full = true) {
  return useQuery({
    queryKey: [...usersQueryKey, 'full-list', preview, full],
    queryFn: () => userApi.getUsers(preview, full),
  });
}

export function useUserById(userId: string) {
  return useQuery({
    queryKey: [...usersQueryKey, userId],
    queryFn: () => userApi.getUserById(userId!),
    enabled: !!userId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: User) => userApi.addUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: UpdateUserInput) => userApi.editUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
  });
}
