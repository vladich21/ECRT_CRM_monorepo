import {
  ConflictException,
  Controller,
  ForbiddenException,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Public } from '../auth/public.decorator';
import { HrSyncService } from './hr-sync.service';

function readHrSyncSecret(req: Request): string {
  const raw = req.headers['x-hr-sync-secret'];
  if (Array.isArray(raw)) return (raw[0] ?? '').trim();
  return (typeof raw === 'string' ? raw : '').trim();
}

@Controller('hr-sync')
export class HrSyncController {
  constructor(
    private readonly hrSync: HrSyncService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Ручной запуск из UI (cookie JWT). Секрет в заголовке не нужен.
   */
  @Post('users/now')
  async syncUsersNow() {
    const out = await this.hrSync.runSyncWithLock();
    if (out.skipped) {
      throw new ConflictException('Синхронизация уже выполняется, подождите завершения');
    }
    return out.result;
  }

  /**
   * Запуск синхронизации пользователей из внешнего HR API в PMDB.
   * Защита: заголовок X-HR-Sync-Secret должен совпадать с HR_USERS_SYNC_SECRET в .env
   * (не путать с вкладкой Authorization Bearer — нужен отдельный заголовок в Headers).
   */
  @Public()
  @Post('users')
  async syncUsers(@Req() req: Request) {
    const expected = (this.config.get<string>('HR_USERS_SYNC_SECRET') ?? '').trim();
    if (!expected) {
      throw new ServiceUnavailableException(
        'Эндпоинт отключен: задайте HR_USERS_SYNC_SECRET в окружении',
      );
    }
    const secret = readHrSyncSecret(req);
    if (!secret || secret !== expected) {
      throw new ForbiddenException(
        'Неверный или отсутствующий X-HR-Sync-Secret. Добавьте в Postman вкладку Headers: ' +
          'ключ X-HR-Sync-Secret, значение = HR_USERS_SYNC_SECRET из .env (не Bearer).',
      );
    }
    const out = await this.hrSync.runSyncWithLock();
    if (out.skipped) {
      throw new ConflictException('Синхронизация уже выполняется');
    }
    return out.result;
  }
}
