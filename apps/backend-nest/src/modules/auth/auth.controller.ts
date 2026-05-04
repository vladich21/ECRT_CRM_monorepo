import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { RateLimitGuard } from './rate-limit.guard';
import { CheckEmailDto } from './dto/check-email.dto';
import { VerifyPasswordDto } from './dto/verify-password.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { ResendCodeDto } from './dto/resend-code.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly rateLimit: RateLimitGuard,
  ) {}

  @Public()
  @Post('check')
  checkEmail(@Body() dto: CheckEmailDto) {
    return this.auth.checkEmail(dto.email);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('login')
  verifyPassword(@Body() dto: VerifyPasswordDto) {
    return this.auth.verifyPassword(dto.email, dto.password);
  }

  @Public()
  @Post('verify-temp-code')
  verifyTempCode(@Body() dto: VerifyCodeDto) {
    return this.auth.verifyTempCode(dto.email, dto.code);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('resend-code')
  resendCode(@Body() dto: ResendCodeDto) {
    return this.auth.resendCode(dto.email, dto.type);
  }

  @Public()
  @UseGuards(RateLimitGuard)
  @Post('verify-2fa')
  async verify2fa(
    @Body() dto: VerifyCodeDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verify2fa(dto.email, dto.code, res);
    this.rateLimit.resetForRequest(req);
    return result;
  }

  @Public()
  @Post('set-password')
  setPassword(@Body() dto: SetPasswordDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.setPassword(dto.email, dto.password, dto.confirmPassword, res);
  }

  @Get('me')
  async getMe(
    @Req()
    req: Request & {
      user?: { user_id: string; sectionPermissions?: { sectionCode: string; canRead: boolean; canEdit: boolean; canDelete: boolean }[] };
    },
  ) {
    const me = await this.auth.getMe(req.user!.user_id);
    return {
      ...me,
      sectionPermissions: req.user!.sectionPermissions ?? [],
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res);
  }
}
