import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { HrSyncService } from './hr-sync.service';

@Injectable()
export class HrSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HrSyncSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly hrSync: HrSyncService,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('EXTERNAL_HR_USERS_URL')?.trim();
    const token = this.config.get<string>('EXTERNAL_HR_API_TOKEN')?.trim();
    if (!url || !token) {
      this.logger.warn(
        'Автосинхронизация HR не запущена: задайте EXTERNAL_HR_USERS_URL и EXTERNAL_HR_API_TOKEN',
      );
      return;
    }

    const raw = this.config.get<string>('HR_SYNC_INTERVAL_MINUTES');
    const minutes = raw != null && raw !== '' ? parseInt(raw, 10) : 15;
    if (Number.isNaN(minutes) || minutes <= 0) {
      this.logger.log(
        'Автосинхронизация HR отключена (HR_SYNC_INTERVAL_MINUTES <= 0 или не число; по умолчанию 15 мин)',
      );
      return;
    }

    const ms = minutes * 60 * 1000;
    this.logger.log(`Автосинхронизация пользователей из HR: интервал ${minutes} мин`);

    this.timer = setInterval(() => {
      void this.hrSync
        .runSyncWithLock()
        .then((out) => {
          if (out.skipped) {
            this.logger.debug('HR sync (планировщик): пропуск — синхронизация уже выполняется');
            return;
          }
          const { created, updated, errors, departments, positions } = out.result;
          this.logger.log(
            `HR sync (планировщик): пользователи +${created}/~${updated}, ошибок ${errors.length}; ` +
              `отделы +${departments.created}/~${departments.updated}, должности +${positions.created}/~${positions.updated}`,
          );
        })
        .catch((err: unknown) => {
          this.logger.error(
            err instanceof Error ? err.stack ?? err.message : err,
            'HR sync (планировщик): ошибка',
          );
        });
    }, ms);
  }

  onModuleDestroy(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Планировщик HR sync остановлен');
    }
  }
}
