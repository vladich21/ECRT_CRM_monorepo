import { Module } from '@nestjs/common';

import { FilesModule } from '../files/files.module';
import { SvnAttachService } from './svn-attach.service';
import { SvnClient } from './svn.client';
import { SvnController } from './svn.controller';

@Module({
  imports: [FilesModule],
  controllers: [SvnController],
  providers: [SvnClient, SvnAttachService],
  // SvnAttachService нужен реестру ПО: документ создаётся сразу с файлом из SVN.
  exports: [SvnClient, SvnAttachService],
})
export class SvnModule {}
