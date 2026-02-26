import { Module } from '@nestjs/common';
import { PatentApplicationAreasController } from './controllers/patent-application-areas.controller';
import { PatentApplicationAreasService } from './services/patent-application-areas.service';

@Module({
  controllers: [PatentApplicationAreasController],
  providers: [PatentApplicationAreasService],
})
export class PatentApplicationAreasModule {}
