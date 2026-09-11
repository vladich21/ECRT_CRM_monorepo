import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ApprovalRoutesController } from './controllers/approval-routes.controller';
import { ApprovalProcessesController } from './controllers/approval-processes.controller';
import { ApprovalTasksController } from './controllers/approval-tasks.controller';
import { ApprovalRoutesService } from './services/approval-routes.service';
import { ApprovalTasksService } from './services/approval-tasks.service';
import { ApprovalEngineService } from './services/approval-engine.service';
import { ApprovalFilesService } from './services/approval-files.service';
import { ApprovalSnapshotService } from './services/approval-snapshot.service';
import { ApprovalStateService } from './services/approval-state.service';
import { ApprovalMailService } from './services/approval-mail.service';
import { ApprovalCommentNotificationService } from './services/approval-comment-notification.service';
import { ApprovalSlaSchedulerService } from './services/approval-sla-scheduler.service';
import { AssigneeResolver } from './resolvers/assignee.resolver';
import { EntityHandlerRegistry } from './entity-handlers/entity-handler.registry';
import { ContractEntityHandler } from './entity-handlers/contract.handler';
import { PartnerEntityHandler } from './entity-handlers/partner.handler';
import { PatentEntityHandler } from './entity-handlers/patent.handler';
import { ProjectEntityHandler } from './entity-handlers/project.handler';
import { PurchaseRequestAgreementHandler } from './entity-handlers/purchase-request-agreement.handler';
import { PurchaseRequestEntityHandler } from './entity-handlers/purchase-request.handler';

/**
 * Модуль «Согласования документов». DatabaseModule и PermissionsModule - глобальные.
 */
@Module({
  imports: [FilesModule],
  controllers: [ApprovalRoutesController, ApprovalProcessesController, ApprovalTasksController],
  providers: [
    ApprovalRoutesService,
    ApprovalTasksService,
    ApprovalEngineService,
    ApprovalFilesService,
    ApprovalSnapshotService,
    ApprovalStateService,
    ApprovalMailService,
    ApprovalCommentNotificationService,
    ApprovalSlaSchedulerService,
    AssigneeResolver,
    EntityHandlerRegistry,
    ContractEntityHandler,
    PartnerEntityHandler,
    PatentEntityHandler,
    ProjectEntityHandler,
    PurchaseRequestEntityHandler,
    PurchaseRequestAgreementHandler,
  ],
  exports: [ApprovalEngineService, ApprovalStateService],
})
export class ApprovalsModule {}
