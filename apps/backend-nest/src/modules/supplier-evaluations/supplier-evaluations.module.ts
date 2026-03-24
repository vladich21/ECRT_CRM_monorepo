import { Module } from '@nestjs/common';
import { SupplierEvaluationsController } from './controllers/supplier-evaluations.controller';
import { SupplierEvaluationsService } from './services/supplier-evaluations.service';

@Module({
  controllers: [SupplierEvaluationsController],
  providers: [SupplierEvaluationsService],
})
export class SupplierEvaluationsModule {}
