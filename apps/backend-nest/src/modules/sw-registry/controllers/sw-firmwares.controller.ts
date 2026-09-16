import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { SwFirmwaresService } from '../services/sw-firmwares.service';

type AuthReq = Request & { user?: { user_id?: string } };

/** Прошивки программы: четыре сегмента пути, как у остальных ручек реестра. */
@Controller('sw/registry/firmwares')
export class SwFirmwaresController {
  constructor(private readonly firmwares: SwFirmwaresService) {}

  /** Путь ровно из трёх сегментов после /api перехватывает FilesController — отсюда 'list'. */
  @Get('list')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  list(@Query('itemId') itemId: string) {
    return this.firmwares.list(itemId);
  }

  /** Разрешение на загрузку: байты идут в хранилище напрямую из браузера. */
  @Post('upload-ticket')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  ticket(
    @Body('body') dto: { itemId: string; filename: string; contentType?: string },
    @Req() req: AuthReq,
  ) {
    return this.firmwares.createUploadTicket(
      dto.itemId,
      { filename: dto.filename, contentType: dto.contentType },
      req.user?.user_id,
    );
  }

  /** Окно закрыли, не оформив прошивку: файл не должен остаться в хранилище. */
  @Delete('upload-ticket/:fileId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  discard(@Param('fileId') fileId: string) {
    return this.firmwares.discardUpload(fileId);
  }

  @Get(':id/link')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  link(@Param('id') id: string) {
    return this.firmwares.getLink(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  create(
    @Body('body')
    dto: {
      itemId: string;
      version: string;
      builtAt?: string | null;
      note?: string | null;
      fileId: string;
      filename: string;
    },
    @Req() req: AuthReq,
  ) {
    return this.firmwares.create(dto.itemId, dto, req.user?.user_id);
  }

  @Delete(':id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  remove(@Param('id') id: string) {
    return this.firmwares.markDeleted(id);
  }
}
