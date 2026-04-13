import { Module } from '@nestjs/common';
import { HrSyncController } from './hr-sync.controller';
import { HrSyncSchedulerService } from './hr-sync-scheduler.service';
import { HrSyncService } from './hr-sync.service';

@Module({
  controllers: [HrSyncController],
  providers: [HrSyncService, HrSyncSchedulerService],
})
export class HrSyncModule {}
