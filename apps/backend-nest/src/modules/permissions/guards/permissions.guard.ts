import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { SectionPermission } from '../../../shared/permissions';
import { PermissionsService } from '../services/permissions.service';
import {
  REQUIRE_PERMISSION_KEY,
  REQUIRE_ANY_PERMISSION_KEY,
  type RequirePermissionMeta,
  type RequireAnyPermissionMeta,
} from '../decorators/permission-meta';

interface AuthRequest extends Request {
  user?: { user_id?: string; sectionPermissions?: SectionPermission[] };
}

/**
 * Проверяет права из метаданных декораторов @RequirePermission /
 * @RequireAnyPermission. Запускается ПОСЛЕ JwtGuard — рассчитывает на
 * заполненный request.user.sectionPermissions.
 *
 * Если декораторов нет — пропускает (open by default; глобальной
 * блокировки не делаем, т.к. много существующих эндпоинтов без меток).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const single = this.reflector.getAllAndOverride<RequirePermissionMeta>(
      REQUIRE_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    const any = this.reflector.getAllAndOverride<RequireAnyPermissionMeta>(
      REQUIRE_ANY_PERMISSION_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!single && !any) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!req.user?.user_id) {
      // Кто-то поставил @RequirePermission на @Public-эндпоинт, или JwtGuard
      // не отработал. Лучше явный 401, чем непонятный 403.
      throw new UnauthorizedException('Требуется авторизация');
    }
    const perms = req.user.sectionPermissions;
    if (!perms) {
      throw new ForbiddenException('Права не загружены: сессия неактуальна');
    }

    if (single) {
      const ok = this.permissions.hasSectionPermission(perms, single.section, single.action);
      if (!ok) throw new ForbiddenException('Нет доступа к разделу');
      return true;
    }

    if (any) {
      const ok = any.sections.some((sec) =>
        this.permissions.hasSectionPermission(perms, sec, any.action),
      );
      if (!ok) throw new ForbiddenException('Нет доступа ни к одному из разделов');
      return true;
    }

    return true;
  }
}
