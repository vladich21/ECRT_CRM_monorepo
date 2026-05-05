import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { RateLimitGuard } from './rate-limit.guard';
import { UsersModule } from '../users/users.module';
import { DatabaseModule } from '../../database/database.module';
import { ImpersonationModule } from '../impersonation/impersonation.module';

@Module({
  imports: [ConfigModule, UsersModule, DatabaseModule, forwardRef(() => ImpersonationModule)],
  controllers: [AuthController],
  providers: [AuthService, MailService, RateLimitGuard],
  exports: [AuthService],
})
export class AuthModule {}
