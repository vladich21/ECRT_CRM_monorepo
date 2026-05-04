export const adminRbacQueryKeys = {
  all: ['admin-rbac'] as const,
  rolesList: () => [...adminRbacQueryKeys.all, 'roles', 'list'] as const,
  rolePermissions: (roleId: string) =>
    [...adminRbacQueryKeys.all, 'roles', roleId, 'permissions'] as const,
  sections: () => [...adminRbacQueryKeys.all, 'sections'] as const,
  userRoles: (userId: string) => [...adminRbacQueryKeys.all, 'users', userId, 'roles'] as const,
};
