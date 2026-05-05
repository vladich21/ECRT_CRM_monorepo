import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { ImpersonationController, StopImpersonationController } from './controllers/impersonation.controller';
import { ImpersonationService } from './services/impersonation.service';

@Module({
  imports: [forwardRef(() => AuthModule), UsersModule],
  controllers: [ImpersonationController, StopImpersonationController],
  providers: [ImpersonationService],
  exports: [ImpersonationService],
})
export class ImpersonationModule {}
