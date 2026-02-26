import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
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
import { PartnerTypesModule } from './modules/partner-types/partner-types.module';
import { PartnerEconomicCategoriesModule } from './modules/partner-economic-categories/partner-economic-categories.module';
import { FilesModule } from './modules/files/files.module';
import { CommentsModule } from './modules/comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env'],
    }),
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
    PartnerTypesModule,
    PartnerEconomicCategoriesModule,
    FilesModule,
    CommentsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
