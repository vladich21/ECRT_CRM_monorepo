import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminRbacApi, type CreateRolePayload, type RolePermissionFlags, type UpdateRolePayload } from './adminRbacApi';
import { adminRbacQueryKeys } from './adminRbacQueryKeys';
import { userQueryKeys } from '../users/userQueryKeys';

export function useAdminRolesList() {
  return useQuery({
    queryKey: adminRbacQueryKeys.rolesList(),
    queryFn: adminRbacApi.listRoles,
  });
}

export function useAdminRolePermissions(roleId: string | null) {
  return useQuery({
    queryKey: adminRbacQueryKeys.rolePermissions(roleId ?? ''),
    queryFn: () => adminRbacApi.getRolePermissions(roleId!),
    enabled: !!roleId,
  });
}

export function useAdminSections() {
  return useQuery({
    queryKey: adminRbacQueryKeys.sections(),
    queryFn: adminRbacApi.listSections,
    staleTime: 30 * 60 * 1000, // 30 мин - справочник меняется редко
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRolePayload) => adminRbacApi.createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolesList() });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateRolePayload }) =>
      adminRbacApi.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolesList() });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminRbacApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolesList() });
    },
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: Record<string, RolePermissionFlags> }) =>
      adminRbacApi.updateRolePermissions(roleId, permissions),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolePermissions(vars.roleId) });
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolesList() });
    },
  });
}

export function useUserRoles(userId: string | null) {
  return useQuery({
    queryKey: adminRbacQueryKeys.userRoles(userId ?? ''),
    queryFn: () => adminRbacApi.getUserRoles(userId!),
    enabled: !!userId,
  });
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      adminRbacApi.assignUserRoles(userId, roleIds),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.userRoles(vars.userId) });
      queryClient.invalidateQueries({ queryKey: adminRbacQueryKeys.rolesList() });
      // Список и карточка пользователя содержат role_name'ы - после смены
      // ролей нужно обновить отображение
      queryClient.invalidateQueries({ queryKey: userQueryKeys.all });
    },
  });
}
