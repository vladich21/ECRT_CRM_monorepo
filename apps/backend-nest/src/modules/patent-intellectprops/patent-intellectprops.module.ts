import { Module } from '@nestjs/common';
import { PatentIntellectpropsController } from './controllers/patent-intellectprops.controller';
import { PatentIntellectpropsService } from './services/patent-intellectprops.service';

@Module({
  controllers: [PatentIntellectpropsController],
  providers: [PatentIntellectpropsService],
})
export class PatentIntellectpropsModule {}
