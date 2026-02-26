import { Controller, Get } from '@nestjs/common';
import { PatentStatusesService } from '../services/patent-statuses.service';

@Controller('patent-statuses')
export class PatentStatusesController {
  constructor(private readonly service: PatentStatusesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
