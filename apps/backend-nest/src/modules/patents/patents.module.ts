import { Module } from '@nestjs/common';
import { PatentsController } from './controllers/patents.controller';
import { PatentsService } from './services/patents.service';

@Module({
  controllers: [PatentsController],
  providers: [PatentsService],
})
export class PatentsModule {}
