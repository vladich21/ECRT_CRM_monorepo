import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { BodyPayload } from '../../../shared/decorators/body-payload.decorator';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import {
  SwFirmwareCreateDto,
  SwFirmwareCreateVersionDto,
  SwFirmwareUpdateDto,
  SwFirmwareUploadTicketDto,
} from '../dto/sw-registry.dto';
import { SwFirmwaresService } from '../services/sw-firmwares.service';

type AuthReq = Request & { user?: { user_id?: string } };

/** Прошивки программы: четыре сегмента пути, как у остальных ручек реестра. */
@Controller('sw/registry/firmwares')
export class SwFirmwaresController {
  constructor(private readonly firmwares: SwFirmwaresService) {}

  /** Путь ровно из трёх сегментов после /api перехватывает FilesController — отсюда 'list'. */
  @Get('list')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  list(@Query('itemId', ParseUUIDPipe) itemId: string) {
    return this.firmwares.list(itemId);
  }

  /** Разрешение на загрузку: байты идут в хранилище напрямую из браузера. */
  @Post('upload-ticket')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  ticket(@BodyPayload() dto: SwFirmwareUploadTicketDto, @Req() req: AuthReq) {
    return this.firmwares.createUploadTicket(
      dto.itemId,
      { filename: dto.filename, contentType: dto.contentType },
      req.user?.user_id,
    );
  }

  /** Окно закрыли, не оформив сборку: файл не должен остаться в хранилище. */
  @Delete('upload-ticket/:fileId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  discard(@Param('fileId', ParseUUIDPipe) fileId: string) {
    return this.firmwares.discardUpload(fileId);
  }

  /** Новая сборка существующей прошивки. */
  @Post('versions')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  createVersion(@BodyPayload() dto: SwFirmwareCreateVersionDto, @Req() req: AuthReq) {
    return this.firmwares.createVersion(dto.firmwareId, dto, req.user?.user_id);
  }

  @Get('versions/:id/link')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  versionLink(@Param('id', ParseUUIDPipe) id: string) {
    return this.firmwares.getVersionLink(id);
  }

  @Delete('versions/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  removeVersion(@Param('id', ParseUUIDPipe) id: string) {
    return this.firmwares.markVersionDeleted(id);
  }

  /** Новая прошивка — сразу с первой сборкой. */
  @Post()
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  create(@BodyPayload() dto: SwFirmwareCreateDto, @Req() req: AuthReq) {
    return this.firmwares.createLine(dto.itemId, dto, req.user?.user_id);
  }

  @Patch(':id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  update(@Param('id', ParseUUIDPipe) id: string, @BodyPayload() dto: SwFirmwareUpdateDto) {
    return this.firmwares.updateLine(id, dto);
  }

  @Delete(':id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.firmwares.markLineDeleted(id);
  }
}
