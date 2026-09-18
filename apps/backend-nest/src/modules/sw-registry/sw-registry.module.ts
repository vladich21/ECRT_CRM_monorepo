import { Module } from '@nestjs/common';

import { CommentsModule } from '../comments/comments.module';
import { FilesModule } from '../files/files.module';
import { SvnModule } from '../svn/svn.module';
import { SwDocumentsController } from './controllers/sw-documents.controller';
import { SwFilesController } from './controllers/sw-files.controller';
import { SwFirmwaresController } from './controllers/sw-firmwares.controller';
import { SwItemsController } from './controllers/sw-items.controller';
import { SwStructureController } from './controllers/sw-structure.controller';
import { SwSummaryController } from './controllers/sw-summary.controller';
import { SwDocumentCreateService } from './services/sw-document-create.service';
import { SwDocumentStatusService } from './services/sw-document-status.service';
import { SwDocumentsService } from './services/sw-documents.service';
import { SwFilesService } from './services/sw-files.service';
import { SwFirmwaresService } from './services/sw-firmwares.service';
import { SwItemsService } from './services/sw-items.service';
import { SwReferencesService } from './services/sw-references.service';
import { SwStructureService } from './services/sw-structure.service';
import { SwSummaryService } from './services/sw-summary.service';

@Module({
  imports: [CommentsModule, FilesModule, SvnModule],
  controllers: [
    SwStructureController,
    SwItemsController,
    SwDocumentsController,
    SwSummaryController,
    SwFilesController,
    SwFirmwaresController,
  ],
  providers: [
    SwReferencesService,
    SwStructureService,
    SwItemsService,
    SwDocumentsService,
    SwDocumentCreateService,
    SwDocumentStatusService,
    SwSummaryService,
    SwFilesService,
    SwFirmwaresService,
  ],
})
export class SwRegistryModule {}
