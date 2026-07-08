import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './services/permissions.service';
import { PermissionsVersionService } from './services/permissions-version.service';
import { PermissionsGuard } from './guards/permissions.guard';

/**
 * Глобальный модуль RBAC. Экспортирует:
 *  - PermissionsService - снимок прав, проверки
 *  - PermissionsVersionService - версия для инвалидации snapshot'ов в JWT
 *  - PermissionsGuard - гард для @RequirePermission декораторов
 */
@Global()
@Module({
  providers: [PermissionsService, PermissionsVersionService, PermissionsGuard],
  exports: [PermissionsService, PermissionsVersionService, PermissionsGuard],
})
export class PermissionsModule {}
