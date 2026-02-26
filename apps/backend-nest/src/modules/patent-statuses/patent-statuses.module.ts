import { Module } from '@nestjs/common';
import { PatentStatusesController } from './controllers/patent-statuses.controller';
import { PatentStatusesService } from './services/patent-statuses.service';

@Module({
  controllers: [PatentStatusesController],
  providers: [PatentStatusesService],
})
export class PatentStatusesModule {}
