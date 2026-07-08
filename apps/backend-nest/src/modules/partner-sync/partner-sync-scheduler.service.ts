import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PartnerSyncService } from './partner-sync.service';

@Injectable()
export class PartnerSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PartnerSyncSchedulerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly partnerSync: PartnerSyncService,
  ) {}

  onModuleInit(): void {
    const thesisDbUrl = this.config.get<string>('THESIS_DB_URL')?.trim();
    if (!thesisDbUrl) {
      this.logger.warn('Автосинхронизация контрагентов отключена: THESIS_DB_URL не задан');
      return;
    }

    const rawMinutes = this.config.get<string>('PARTNER_SYNC_INTERVAL_MINUTES');
    const minutes = rawMinutes != null && rawMinutes !== '' ? parseInt(rawMinutes, 10) : 15;
    if (Number.isNaN(minutes) || minutes <= 0) {
      this.logger.log(
        'Автосинхронизация контрагентов отключена (PARTNER_SYNC_INTERVAL_MINUTES <= 0 или не число; по умолчанию 15 мин)',
      );
      return;
    }

    const intervalMs = minutes * 60 * 1000;
    this.logger.log(`Автосинхронизация контрагентов из Тезиса: интервал ${minutes} мин`);

    this.timer = setInterval(() => {
      void this.partnerSync
        .runSyncWithLock()
        .then((out) => {
          if (out.skipped) {
            this.logger.debug(
              'Partner sync (планировщик): пропуск - синхронизация уже выполняется',
            );
            return;
          }
          const { created, linked, skippedByThesisId, errors } = out.result;
          this.logger.log(
            `Partner sync (планировщик): created=${created}, linked=${linked}, already_synced=${skippedByThesisId}, errors=${errors.length}`,
          );
        })
        .catch((error: unknown) => {
          this.logger.error(
            error instanceof Error ? error.stack ?? error.message : error,
            'Partner sync (планировщик): ошибка',
          );
        });
    }, intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('Планировщик partner-sync остановлен');
    }
  }
}
