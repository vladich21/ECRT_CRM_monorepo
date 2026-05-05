import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { PermissionsVersionService } from '../permissions/services/permissions-version.service';
import type { SectionPermission } from '../../shared/permissions';

const RENEW_THRESHOLD_SEC = 24 * 60 * 60; // обновить токен если осталось < 24 часов

interface AuthRequestUser {
  user_id: string;
  sectionPermissions: SectionPermission[];
  exp?: number;
  impersonatedBy?: string;
}

@Injectable()
export class JwtGuard implements CanActivate {
  private readonly logger = new Logger(JwtGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly permissionsVersion: PermissionsVersionService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user: AuthRequestUser }>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const token = req.cookies?.['auth_token'];
    if (!token) throw new UnauthorizedException('Токен отсутствует');

    let payload: {
      user_id: string;
      exp?: number;
      sectionPermissions?: SectionPermission[];
      pv?: number;
      impersonatedBy?: string;
    };
    try {
      payload = await this.authService.verifyJwt(token);
    } catch (err) {
      const reason =
        (err as { code?: string; name?: string; message?: string })?.code ??
        (err as { name?: string })?.name ??
        'unknown';
      const tokenLen = typeof token === 'string' ? token.length : 0;
      this.logger.warn(
        `JWT verify failed: ${reason} (path=${req.path}, ua=${(req.headers['user-agent'] ?? '').toString().slice(0, 40)}, tokenLen=${tokenLen})`,
      );
      throw new UnauthorizedException('Недействительный токен');
    }

    let sectionPermissions = payload.sectionPermissions ?? [];

    // Если pv в токене не совпадает с серверным — перевыпускаем токен
    // с актуальным snapshot прав. Также покрывает старые токены без pv.
    // impersonatedBy сохраняем, чтобы не сломать активную сессию имперсонации.
    if (payload.pv !== this.permissionsVersion.get()) {
      sectionPermissions = await this.authService.refreshTokenPermissions(
        payload.user_id,
        res,
        payload.impersonatedBy,
      );
    }

    req.user = {
      user_id: payload.user_id,
      sectionPermissions,
      exp: payload.exp,
      impersonatedBy: payload.impersonatedBy,
    };

    if (payload.exp) {
      const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
      if (secondsLeft < RENEW_THRESHOLD_SEC) {
        await this.authService.renewToken(payload.user_id, res, payload.impersonatedBy);
      }
    }

    return true;
  }
}
