import { Module } from '@nestjs/common';
import { HrSyncController } from './hr-sync.controller';
import { HrSyncService } from './hr-sync.service';

@Module({
  controllers: [HrSyncController],
  providers: [HrSyncService],
})
export class HrSyncModule {}
