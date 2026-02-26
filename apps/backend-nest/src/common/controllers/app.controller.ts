import { Controller, Get } from '@nestjs/common';
import { HelloResponseDto } from '../dto/hello-response.dto';

@Controller()
export class AppController {
  @Get()
  getHello(): HelloResponseDto {
    return {
      message: 'SRN API',
      status: 'ok',
    };
  }

  @Get('health')
  health(): HelloResponseDto {
    return {
      message: 'ok',
      status: 'healthy',
    };
  }
}
