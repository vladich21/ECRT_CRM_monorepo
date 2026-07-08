import { Body, Controller, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ImpersonationService } from '../services/impersonation.service';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';

interface AuthRequest extends Request {
  user?: {
    user_id: string;
    impersonatedBy?: string;
  };
}

@Controller('admin/impersonate')
export class ImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}

  /**
   * Войти как пользователь.
   * Право admin.impersonate:edit обязательно (по сидам - только у роли admin).
   */
  @Post(':userId')
  @RequirePermission(SECTIONS.ADMIN_IMPERSONATE, 'edit')
  async start(
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
    @Body() _body: unknown,
  ) {
    const adminId = req.user!.user_id;
    const isAlreadyImpersonating = !!req.user!.impersonatedBy;
    return this.impersonation.start(adminId, targetUserId, isAlreadyImpersonating, res);
  }
}

@Controller('admin/stop-impersonation')
export class StopImpersonationController {
  constructor(private readonly impersonation: ImpersonationService) {}

  /**
   * Завершить имперсонацию.
   * Намеренно без @RequirePermission - текущая JWT-сессия может уже не иметь
   * admin.impersonate (мы под целевым пользователем). Доступ контролируем по
   * наличию impersonatedBy в токене.
   */
  @Post()
  async stop(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    const adminId = req.user?.impersonatedBy ?? '';
    return this.impersonation.stop(adminId, res);
  }
}
