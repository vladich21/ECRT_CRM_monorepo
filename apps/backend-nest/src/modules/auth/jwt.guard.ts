import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const RENEW_THRESHOLD_SEC = 24 * 60 * 60; // обновить токен если осталось < 24 часов

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user: unknown }>();
    const res = ctx.switchToHttp().getResponse<Response>();

    const token = req.cookies?.['auth_token'];
    if (!token) throw new UnauthorizedException('Токен отсутствует');

    let payload: { user_id: string; exp?: number };
    try {
      payload = await this.authService.verifyJwt(token);
    } catch {
      throw new UnauthorizedException('Недействительный токен');
    }

    req.user = payload;

    if (payload.exp) {
      const secondsLeft = payload.exp - Math.floor(Date.now() / 1000);
      if (secondsLeft < RENEW_THRESHOLD_SEC) {
        await this.authService.renewToken(payload.user_id, res);
      }
    }

    return true;
  }
}
