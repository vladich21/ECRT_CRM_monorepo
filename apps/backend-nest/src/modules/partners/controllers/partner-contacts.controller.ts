import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { PartnerContactsService } from '../services/partner-contacts.service';

@Controller('partners/:partnerId/contacts')
export class PartnerContactsController {
  constructor(private readonly service: PartnerContactsService) {}

  @Get()
  findAll(@Param('partnerId') partnerId: string) {
    return this.service.findAll(partnerId);
  }

  @Get(':contactId')
  async findOne(@Param('partnerId') partnerId: string, @Param('contactId') contactId: string) {
    const row = await this.service.findOne(partnerId, contactId);
    return row ? [row] : [];
  }

  @Post()
  async create(@Param('partnerId') partnerId: string, @Body('body') body?: Record<string, unknown>) {
    const row = await this.service.create(partnerId, body ?? {});
    return row ? [row] : [];
  }

  @Put(':contactId')
  async update(
    @Param('partnerId') partnerId: string,
    @Param('contactId') contactId: string,
    @Body('body') body?: Record<string, unknown>,
  ) {
    const row = await this.service.update(partnerId, contactId, body ?? {});
    if (!row) throw new NotFoundException(`Контакт ${contactId} не найден`);
    return [row];
  }

  @Delete(':contactId')
  async remove(@Param('partnerId') partnerId: string, @Param('contactId') contactId: string) {
    const row = await this.service.remove(partnerId, contactId);
    if (!row) throw new NotFoundException(`Контакт ${contactId} не найден`);
    return [row];
  }
}
