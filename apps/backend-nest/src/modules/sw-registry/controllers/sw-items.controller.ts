import { Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { BodyPayload } from '../../../shared/decorators/body-payload.decorator';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import {
  AddSwItemPatentDto,
  CreateSwDocumentDto,
  CreateSwItemDto,
  SwDocumentUploadTicketDto,
  UpdateSwItemDto,
} from '../dto/sw-registry.dto';
import { SwDocumentCreateService } from '../services/sw-document-create.service';
import { SwItemsService } from '../services/sw-items.service';

type AuthReq = Request & { user?: { user_id?: string } };

@Controller('sw/items')
export class SwItemsController {
  constructor(
    private readonly items: SwItemsService,
    private readonly documentCreate: SwDocumentCreateService,
  ) {}

  @Get()
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  list(
    @Query('elementId') elementId?: string,
    @Query('developmentKind') developmentKind?: string,
    @Query('partnerId') partnerId?: string,
    @Query('recordState') recordState?: string,
    @Query('documentStatus') documentStatus?: string,
    @Query('sheetStatus') sheetStatus?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.items.list({
      elementId,
      developmentKind,
      partnerId,
      recordState,
      documentStatus,
      sheetStatus,
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  create(@BodyPayload() dto: CreateSwItemDto, @Req() req: AuthReq) {
    return this.items.create(dto, req.user?.user_id);
  }

  @Get('detail/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  getById(@Param('id') id: string) {
    return this.items.getById(id);
  }

  @Patch('detail/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  update(@Param('id') id: string, @BodyPayload() dto: UpdateSwItemDto, @Req() req: AuthReq) {
    return this.items.update(id, dto, req.user?.user_id);
  }

  @Post('detail/:id/archive')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  archive(@Param('id') id: string) {
    return this.items.archive(id);
  }

  @Post('detail/:id/restore')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  restore(@Param('id') id: string) {
    return this.items.restore(id);
  }

  @Post('detail/:id/mark-deleted')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  markDeleted(@Param('id') id: string) {
    return this.items.markDeleted(id);
  }

  @Post('detail/:id/documents')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  addDocument(@Param('id') id: string, @BodyPayload() dto: CreateSwDocumentDto, @Req() req: AuthReq) {
    return this.documentCreate.create(id, dto, req.user?.user_id);
  }

  /** Загрузка файла с компьютера для документа, которого ещё нет: браузер льёт байты tus-ом напрямую. */
  @Post('detail/:id/documents/upload-ticket')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  createDocumentUploadTicket(
    @Param('id') id: string,
    @BodyPayload() dto: SwDocumentUploadTicketDto,
    @Req() req: AuthReq,
  ) {
    return this.documentCreate.createUploadTicket(id, dto, req.user?.user_id);
  }

  /** Отказ от загруженного, но не использованного файла (окно закрыли без создания документа). */
  @Delete('detail/:id/documents/upload-ticket/:fileId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  discardDocumentUpload(@Param('fileId') fileId: string) {
    return this.documentCreate.discardUpload(fileId);
  }

  @Get('detail/:id/patents')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  listPatentLinks(@Param('id') id: string) {
    return this.items.listPatentLinks(id);
  }

  @Post('detail/:id/patents')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  addPatentLink(@Param('id') id: string, @BodyPayload() dto: AddSwItemPatentDto, @Req() req: AuthReq) {
    return this.items.addPatentLink(id, dto, req.user?.user_id);
  }

  @Delete('detail/:id/patents/:patentId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  removePatentLink(@Param('id') id: string, @Param('patentId') patentId: string) {
    return this.items.removePatentLink(id, patentId);
  }
}
