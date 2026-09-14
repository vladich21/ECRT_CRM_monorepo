import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { JwtGuard } from './modules/auth/jwt.guard';
import { PermissionsGuard } from './modules/permissions/guards/permissions.guard';
import { DatabaseModule } from './database/database.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppController } from './common/controllers/app.controller';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PositionsModule } from './modules/positions/positions.module';
import { RolesModule } from './modules/roles/roles.module';
import { ContractsModule } from './modules/contracts/contracts.module';
import { ContractStatesModule } from './modules/contract-states/contract-states.module';
import { ContractCategoriesModule } from './modules/contract-categories/contract-categories.module';
import { ContractTypesModule } from './modules/contract-types/contract-types.module';
import { PartnersModule } from './modules/partners/partners.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PatentsModule } from './modules/patents/patents.module';
import { PatentStatusesModule } from './modules/patent-statuses/patent-statuses.module';
import { PatentIntellectpropsModule } from './modules/patent-intellectprops/patent-intellectprops.module';
import { PatentApplicationAreasModule } from './modules/patent-application-areas/patent-application-areas.module';
import { PatentGrantsModule } from './modules/patent-grants/patent-grants.module';
import { PartnerCompetenciesModule } from './modules/partner-competencies/partner-competencies.module';
import { PartnerStatusesModule } from './modules/partner-statuses/partner-statuses.module';
import { PartnerCategoriesModule } from './modules/partner-categories/partner-categories.module';
import { PartnerTypesModule } from './modules/partner-types/partner-types.module';
import { PartnerEconomicCategoriesModule } from './modules/partner-economic-categories/partner-economic-categories.module';
import { FilesModule } from './modules/files/files.module';
import { CommentsModule } from './modules/comments/comments.module';
import { SupplierEvaluationsModule } from './modules/supplier-evaluations/supplier-evaluations.module';
import { HrSyncModule } from './modules/hr-sync/hr-sync.module';
import { PartnerSyncModule } from './modules/partner-sync/partner-sync.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AdminRbacModule } from './modules/admin-rbac/admin-rbac.module';
import { ImpersonationModule } from './modules/impersonation/impersonation.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { GanttModule } from './modules/gantt/gantt.module';
import { SwRegistryModule } from './modules/sw-registry/sw-registry.module';
import { OnlyofficeModule } from './modules/onlyoffice/onlyoffice.module';
import { SvnModule } from './modules/svn/svn.module';
import { ProcurementRequestsModule } from './modules/procurement-requests/procurement-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Сначала .env - общие секреты (SMTP и т.д.), затем .env.development;
      // при совпадении ключей побеждает .env (см. merge в @nestjs/config loadEnvFile).
      envFilePath: ['.env', '.env.development'],
    }),
    EventEmitterModule.forRoot(),
    PermissionsModule,
    AdminRbacModule,
    ImpersonationModule,
    AuthModule,
    DatabaseModule,
    UsersModule,
    DepartmentsModule,
    PositionsModule,
    RolesModule,
    ContractsModule,
    ContractStatesModule,
    ContractCategoriesModule,
    ContractTypesModule,
    PartnersModule,
    ProjectsModule,
    PatentsModule,
    PatentStatusesModule,
    PatentIntellectpropsModule,
    PatentApplicationAreasModule,
    PatentGrantsModule,
    PartnerCompetenciesModule,
    PartnerStatusesModule,
    PartnerCategoriesModule,
    PartnerTypesModule,
    PartnerEconomicCategoriesModule,
    // ВАЖНО: до FilesModule. У FilesController пустой префикс и жадный
    // @Get(':entityType/:entityId/:filename') - он перехватывает любые
    // 3-сегментные GET /api/X/Y/Z (например /sw/items/:id, /sw/references/:kind).
    // SW: GET только через 4+ сегмента — /sw/items/detail/:id, /sw/references/kind/:kind.
    // POST/PATCH тоже под detail/ для единообразия (3-сегментные GET ловит files-catch-all).
    ApprovalsModule,
    GanttModule,
    SwRegistryModule,
    OnlyofficeModule,
    SvnModule,
    ProcurementRequestsModule,
    FilesModule,
    CommentsModule,
    SupplierEvaluationsModule,
    HrSyncModule,
    PartnerSyncModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {}
