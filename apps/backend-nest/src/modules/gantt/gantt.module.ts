import { Module } from '@nestjs/common';

import { GanttController } from './controllers/gantt.controller';
import { GanttService } from './services/gantt.service';

@Module({
  controllers: [GanttController],
  providers: [GanttService],
  exports: [GanttService],
})
export class GanttModule {}
