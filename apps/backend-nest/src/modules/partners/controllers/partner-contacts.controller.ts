import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
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
  async create(
    @Param('partnerId') partnerId: string,
    @Body('body') body?: Record<string, unknown>,
    @Req() req?: Request & { user?: { user_id?: string } },
  ) {
    const userId = req?.user?.user_id;
    const row = await this.service.create(partnerId, body ?? {}, userId);
    return row ? [row] : [];
  }

  @Put(':contactId')
  async update(
    @Param('partnerId') partnerId: string,
    @Param('contactId') contactId: string,
    @Body('body') body?: Record<string, unknown>,
    @Req() req?: Request & { user?: { user_id?: string } },
  ) {
    const userId = req?.user?.user_id;
    const row = await this.service.update(partnerId, contactId, body ?? {}, userId);
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
