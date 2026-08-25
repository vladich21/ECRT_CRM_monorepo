import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { FilesController } from './controllers/files.controller';
import { FilesRemoteClient } from './services/files-remote.client';
import { FilesService } from './services/files.service';

@Module({
  imports: [PartnersModule],
  controllers: [FilesController],
  providers: [FilesService, FilesRemoteClient],
  exports: [FilesService, FilesRemoteClient],
})
export class FilesModule {}