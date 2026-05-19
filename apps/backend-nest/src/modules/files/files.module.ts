import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { FilesController } from './controllers/files.controller';
import { FilesService } from './services/files.service';

@Module({
  imports: [PartnersModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
