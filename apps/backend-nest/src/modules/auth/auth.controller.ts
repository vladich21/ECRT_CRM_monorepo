import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('auth')
@Public()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post()
  login(@Body() body: { login?: string; pass?: string }) {
    const { login, pass } = body;
    if (!login || !pass) throw new BadRequestException('login и pass обязательны');
    return this.auth.login(login, pass);
  }
}
