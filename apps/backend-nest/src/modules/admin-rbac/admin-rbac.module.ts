import { Module } from '@nestjs/common';
import { AdminRbacController } from './controllers/admin-rbac.controller';
import { AdminRbacService } from './services/admin-rbac.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminRbacController],
  providers: [AdminRbacService],
})
export class AdminRbacModule {}
