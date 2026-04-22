import { Module } from '@nestjs/common';

import { PartnerSyncController } from './partner-sync.controller';
import { PartnerSyncSchedulerService } from './partner-sync-scheduler.service';
import { PartnerSyncService } from './partner-sync.service';

@Module({
  controllers: [PartnerSyncController],
  providers: [PartnerSyncService, PartnerSyncSchedulerService],
})
export class PartnerSyncModule {}
