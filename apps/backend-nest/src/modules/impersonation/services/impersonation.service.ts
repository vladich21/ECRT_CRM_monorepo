import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/services/users.service';
import { PermissionsService } from '../../permissions/services/permissions.service';
import { SECTIONS } from '../../../shared/permissions';

const AUTH_COOKIE = 'auth_token';
const ADMIN_BACKUP_COOKIE = 'admin_token';
const BACKUP_TTL_SECONDS = 3 * 24 * 60 * 60;

@Injectable()
export class ImpersonationService {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly permissions: PermissionsService,
  ) {}

  /**
   * Запуск имперсонации.
   *
   * Контракт:
   *  - Запрещаем self-impersonate (target == admin).
   *  - Запрещаем входить в неактивного пользователя.
   *  - Запрещаем «админ-под-админом»: если у цели есть admin.impersonate:edit - отказ.
   *  - Запрещаем вложенную имперсонацию (если текущая сессия уже imperсонирует).
   */
  async start(
    adminId: string,
    targetUserId: string,
    isAlreadyImpersonating: boolean,
    res: Response,
  ): Promise<{ user: unknown }> {
    if (isAlreadyImpersonating) {
      throw new ForbiddenException('Вложенная имперсонация запрещена. Сначала завершите текущую сессию.');
    }
    if (adminId === targetUserId) {
      throw new BadRequestException('Нельзя войти под самим собой');
    }

    const target = await this.users.findOne(targetUserId);
    if (!target) throw new NotFoundException('Пользователь не найден');
    if (!target.is_active) throw new ForbiddenException('Учетная запись цели деактивирована');

    // Защита от «админ-под-админом»: если у цели есть право admin.impersonate:edit,
    // войти под ней не даем - иначе можно эскалировать привилегии через цепочку.
    const targetPerms = await this.permissions.getUserSectionPermissions(targetUserId);
    if (this.permissions.hasSectionPermission(targetPerms, SECTIONS.ADMIN_IMPERSONATE, 'edit')) {
      throw new ForbiddenException(
        'Нельзя войти под пользователем, у которого есть право входить как другой пользователь',
      );
    }

    // 1. Backup-cookie: свежий JWT для админа, чтобы по «выйти» вернуться без БД-запроса.
    const adminPerms = await this.permissions.getUserSectionPermissions(adminId);
    const adminToken = await this.auth.signJwtForUser(adminId, adminPerms);
    res.cookie(ADMIN_BACKUP_COOKIE, adminToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: BACKUP_TTL_SECONDS * 1000,
      path: '/',
    });

    // 2. Основной auth-token: подписываем под target c claim impersonatedBy=adminId.
    const targetToken = await this.auth.signJwtForUser(targetUserId, targetPerms, adminId);
    res.cookie(AUTH_COOKIE, targetToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: BACKUP_TTL_SECONDS * 1000,
      path: '/',
    });

    return { user: target };
  }

  /**
   * Завершение имперсонации.
   * Возвращает админа в свою сессию: подписываем свежий JWT по adminId,
   * чистим backup-cookie.
   */
  async stop(adminId: string, res: Response): Promise<{ user: unknown }> {
    if (!adminId) {
      throw new BadRequestException('Сессия имперсонации не активна');
    }

    const admin = await this.users.findOne(adminId);
    if (!admin) {
      // Очистим cookies - невалидное состояние
      res.clearCookie(AUTH_COOKIE, { path: '/' });
      res.clearCookie(ADMIN_BACKUP_COOKIE, { path: '/' });
      throw new NotFoundException('Учетная запись администратора не найдена');
    }
    if (!admin.is_active) {
      res.clearCookie(AUTH_COOKIE, { path: '/' });
      res.clearCookie(ADMIN_BACKUP_COOKIE, { path: '/' });
      throw new ForbiddenException('Учетная запись администратора деактивирована');
    }

    const adminPerms = await this.permissions.getUserSectionPermissions(adminId);
    const token = await this.auth.signJwtForUser(adminId, adminPerms);
    res.cookie(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: BACKUP_TTL_SECONDS * 1000,
      path: '/',
    });
    res.clearCookie(ADMIN_BACKUP_COOKIE, { path: '/' });

    return { user: admin };
  }

  /**
   * Контекст имперсонации для /auth/me.
   * Возвращает данные admin'а, который вошел под текущего пользователя, либо null.
   */
  async getContext(impersonatedBy: string | undefined): Promise<{
    active: true;
    adminId: string;
    adminName: string;
    adminEmail: string;
  } | null> {
    if (!impersonatedBy) return null;
    const admin = await this.users.findOne(impersonatedBy);
    if (!admin) return null;
    const fullName =
      [admin.last_name, admin.first_name, admin.middle_name].filter(Boolean).join(' ').trim() ||
      admin.email;
    return {
      active: true,
      adminId: admin.id,
      adminName: fullName,
      adminEmail: admin.email,
    };
  }

  /**
   * Утилита: дочитать `req.cookies.admin_token` пытаясь верифицировать.
   * Используется только если потребуется fallback - сейчас не нужно.
   */
  async tryDecodeBackup(req: Request): Promise<string | null> {
    const token = req.cookies?.[ADMIN_BACKUP_COOKIE];
    if (!token) return null;
    try {
      const payload = await this.auth.verifyJwt(token);
      return payload.user_id;
    } catch {
      return null;
    }
  }
}
