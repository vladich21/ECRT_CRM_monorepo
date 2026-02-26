import { Module } from '@nestjs/common';
import { PatentGrantsController } from './controllers/patent-grants.controller';
import { PatentGrantsService } from './services/patent-grants.service';

@Module({
  controllers: [PatentGrantsController],
  providers: [PatentGrantsService],
})
export class PatentGrantsModule {}
