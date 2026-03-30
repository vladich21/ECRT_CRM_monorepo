import { Module } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { SupplierEvaluationsController } from './controllers/supplier-evaluations.controller';
import { SupplierEvaluationsService } from './services/supplier-evaluations.service';

@Module({
  imports: [PartnersModule],
  controllers: [SupplierEvaluationsController],
  providers: [SupplierEvaluationsService],
})
export class SupplierEvaluationsModule {}
