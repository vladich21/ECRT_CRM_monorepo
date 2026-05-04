import { apiClient } from '../clients';

export interface AdminRole {
  id: string;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  is_system: boolean;
  member_count: number;
  permission_count: number;
  created_at: string;
  updated_at: string | null;
}

export interface AdminSection {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  is_folder: boolean;
  sort_order: number;
}

export interface RolePermissionFlags {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface RoleSectionWithPermissions extends AdminSection {
  permissions: RolePermissionFlags | null;
}

export interface RolePermissionsResponse {
  sections: RoleSectionWithPermissions[];
}

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const adminRbacApi = {
  listRoles: async (): Promise<AdminRole[]> => {
    const res = await apiClient.get<AdminRole[]>('/admin/roles');
    return res.data;
  },

  createRole: async (payload: CreateRolePayload): Promise<{ id: string }> => {
    const res = await apiClient.post<{ id: string }>('/admin/roles', payload);
    return res.data;
  },

  updateRole: async (id: string, payload: UpdateRolePayload): Promise<void> => {
    await apiClient.put(`/admin/roles/${id}`, payload);
  },

  deleteRole: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/roles/${id}`);
  },

  getRolePermissions: async (id: string): Promise<RolePermissionsResponse> => {
    const res = await apiClient.get<RolePermissionsResponse>(`/admin/roles/${id}/permissions`);
    return res.data;
  },

  updateRolePermissions: async (
    id: string,
    permissions: Record<string, RolePermissionFlags>,
  ): Promise<void> => {
    await apiClient.put(`/admin/roles/${id}/permissions`, { permissions });
  },

  listSections: async (): Promise<AdminSection[]> => {
    const res = await apiClient.get<AdminSection[]>('/admin/sections');
    return res.data;
  },

  getUserRoles: async (userId: string): Promise<{ role_ids: string[] }> => {
    const res = await apiClient.get<{ role_ids: string[] }>(`/admin/users/${userId}/roles`);
    return res.data;
  },

  assignUserRoles: async (userId: string, roleIds: string[]): Promise<void> => {
    await apiClient.put(`/admin/users/${userId}/roles`, { roleIds });
  },
};
