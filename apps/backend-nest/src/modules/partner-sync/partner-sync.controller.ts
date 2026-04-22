import { ConflictException, Controller, Get, Post } from '@nestjs/common';

import { PartnerSyncService } from './partner-sync.service';

@Controller('partner-sync')
export class PartnerSyncController {
  constructor(private readonly partnerSync: PartnerSyncService) {}

  @Post('sync')
  async runSyncNow() {
    const out = await this.partnerSync.runSyncWithLock();
    if (out.skipped) {
      throw new ConflictException('Синхронизация контрагентов уже выполняется');
    }
    return out.result;
  }

  @Get('status')
  async getStatus() {
    return this.partnerSync.getSyncStatus();
  }
}
