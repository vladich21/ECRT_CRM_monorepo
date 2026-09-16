import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { SwFirmwaresService } from '../services/sw-firmwares.service';

type AuthReq = Request & { user?: { user_id?: string } };

type VersionBody = {
  version: string;
  builtAt?: string | null;
  versionNote?: string | null;
  fileId: string;
  filename: string;
};

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

  /** Окно закрыли, не оформив сборку: файл не должен остаться в хранилище. */
  @Delete('upload-ticket/:fileId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  discard(@Param('fileId') fileId: string) {
    return this.firmwares.discardUpload(fileId);
  }

  /** Новая сборка существующей прошивки. */
  @Post('versions')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  createVersion(
    @Body('body') dto: VersionBody & { firmwareId: string },
    @Req() req: AuthReq,
  ) {
    return this.firmwares.createVersion(dto.firmwareId, dto, req.user?.user_id);
  }

  @Get('versions/:id/link')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  versionLink(@Param('id') id: string) {
    return this.firmwares.getVersionLink(id);
  }

  @Delete('versions/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  removeVersion(@Param('id') id: string) {
    return this.firmwares.markVersionDeleted(id);
  }

  /** Новая прошивка — сразу с первой сборкой. */
  @Post()
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  create(
    @Body('body') dto: VersionBody & { itemId: string; name: string; note?: string | null },
    @Req() req: AuthReq,
  ) {
    return this.firmwares.createLine(dto.itemId, dto, req.user?.user_id);
  }

  @Patch(':id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  update(@Param('id') id: string, @Body('body') dto: { name?: string; note?: string | null }) {
    return this.firmwares.updateLine(id, dto);
  }

  @Delete(':id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  remove(@Param('id') id: string) {
    return this.firmwares.markLineDeleted(id);
  }
}
