import { Module } from '@nestjs/common';
import { PositionsController } from './controllers/positions.controller';
import { PositionsService } from './services/positions.service';

@Module({
  controllers: [PositionsController],
  providers: [PositionsService],
})
export class PositionsModule {}
