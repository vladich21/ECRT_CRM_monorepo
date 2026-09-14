import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { OnlyofficeController } from './onlyoffice.controller';
import { OnlyofficeService } from './onlyoffice.service';

@Module({
  imports: [FilesModule],
  controllers: [OnlyofficeController],
  providers: [OnlyofficeService],
})
export class OnlyofficeModule {}
