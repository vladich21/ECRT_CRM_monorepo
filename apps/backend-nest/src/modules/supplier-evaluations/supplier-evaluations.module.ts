import { Module, forwardRef } from '@nestjs/common';
import { PartnersModule } from '../partners/partners.module';
import { SupplierEvaluationsController } from './controllers/supplier-evaluations.controller';
import { SupplierEvaluationsService } from './services/supplier-evaluations.service';

@Module({
  imports: [forwardRef(() => PartnersModule)],
  controllers: [SupplierEvaluationsController],
  providers: [SupplierEvaluationsService],
  exports: [SupplierEvaluationsService],
})
export class SupplierEvaluationsModule {}
