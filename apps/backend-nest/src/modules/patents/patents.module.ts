import { Module } from '@nestjs/common';
import { PatentsController } from './controllers/patents.controller';
import { PatentExportService } from './services/patent-export.service';
import { PatentsService } from './services/patents.service';

@Module({
  controllers: [PatentsController],
  providers: [PatentsService, PatentExportService],
})
export class PatentsModule {}
