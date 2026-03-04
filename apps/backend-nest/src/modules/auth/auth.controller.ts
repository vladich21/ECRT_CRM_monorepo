import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RateLimitGuard } from './rate-limit.guard';
import { CheckEmailDto } from './dto/check-email.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitGuard,
  ) {}

  // Шаг 1: проверить email — rate limit не ставим: неверный email не раскрывает пароль, лимит только на login/2fa
  @Public()
  @Post('check')
  checkEmail(@Body() dto: CheckEmailDto) {
    return this.auth.checkEmail(dto.email);
  }

  // Шаг 2: ввод пароля — при успехе сбрасываем rate limit для этого IP
  @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  verifyPassword(
    @Body() dto: VerifyPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.verifyPassword(dto.email, dto.password);
  }

  // Ввод временного кода (первый вход)
  @Public()
  @Post('verify-temp-code')
  verifyTempCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyTempCode(dto.email, dto.code);
  }

  // Ввод 2FA кода — сброс rate limit при успехе
  @Public()
  @UseGuards(RateLimitGuard)
  @Post('verify-2fa')
  async verify2fa(
    @Body() dto: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify2fa(dto.email, dto.code, res);
    this.rateLimit.reset(this.getIp(req));
    return result;
  }

  // Установить постоянный пароль
  @Public()
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.setPassword(dto.email, dto.password, dto.confirmPassword, res);
  }

  // Данные текущего пользователя — защищённый маршрут (без @Public)
  @Get('me')
  getMe(@Req() req: Request & { user?: { user_id: string } }) {
    return this.auth.getMe(req.user!.user_id);
  }

  // Выход
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res);
  }

  private getIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
    return req.socket.remoteAddress ?? 'unknown';
  }
}
