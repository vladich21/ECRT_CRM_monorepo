import { Controller, Get } from '@nestjs/common';
import { PatentIntellectpropsService } from '../services/patent-intellectprops.service';

@Controller('patent-intellectprops')
export class PatentIntellectpropsController {
  constructor(private readonly service: PatentIntellectpropsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
