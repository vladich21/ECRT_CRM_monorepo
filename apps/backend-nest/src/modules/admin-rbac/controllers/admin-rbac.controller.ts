import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { AdminRbacService } from '../services/admin-rbac.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto';
import { UpdatePermissionsDto } from '../dto/update-permissions.dto';
import { AssignUserRolesDto } from '../dto/assign-user-roles.dto';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';

@Controller('admin')
export class AdminRbacController {
  constructor(private readonly service: AdminRbacService) {}

  // Roles
  @Get('roles')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'read')
  listRoles() {
    return this.service.listRoles();
  }

  @Post('roles')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'edit')
  createRole(@Body() body: { body: CreateRoleDto }) {
    return this.service.createRole(body.body);
  }

  @Put('roles/:id')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'edit')
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() body: { body: UpdateRoleDto }) {
    return this.service.updateRole(id, body.body);
  }

  @Delete('roles/:id')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'delete')
  deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteRole(id);
  }

  // Role permissions
  @Get('roles/:id/permissions')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'read')
  getRolePermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getRolePermissions(id);
  }

  @Put('roles/:id/permissions')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'edit')
  updateRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { body: UpdatePermissionsDto },
  ) {
    return this.service.updateRolePermissions(id, body.body.permissions);
  }

  // Sections (read-only справочник)
  @Get('sections')
  @RequirePermission(SECTIONS.ADMIN_ROLES, 'read')
  listSections() {
    return this.service.listSections();
  }

  // User-role assignments
  @Get('users/:id/roles')
  @RequirePermission(SECTIONS.ADMIN_USERS, 'read')
  getUserRoles(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getUserRoles(id);
  }

  @Put('users/:id/roles')
  @RequirePermission(SECTIONS.ADMIN_USERS, 'edit')
  assignUserRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { body: AssignUserRolesDto },
  ) {
    return this.service.assignUserRoles(id, body.body.roleIds);
  }
}
