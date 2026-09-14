import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermission } from '../permissions/decorators/permission-meta';
import { SECTIONS } from '../../shared/permissions';
import { OnlyofficeService } from './onlyoffice.service';

type AuthReq = Request & {
  user?: { user_id?: string; first_name?: string; last_name?: string; email?: string };
};

/**
 * Просмотр документов реестра ПО через OnlyOffice Document Server.
 *
 * Префикс из трёх сегментов (onlyoffice/config/:id) перехватывал бы
 * FilesController с шаблоном ':entityType/:entityId/:filename' — отсюда
 * четыре сегмента, как у sw/files.
 */
@Controller('sw/viewer')
export class OnlyofficeController {
  constructor(private readonly onlyoffice: OnlyofficeService) {}

  /** Адрес Document Server — фронт заранее подтягивает движок просмотра. */
  @Get('ds-url')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  dsUrl() {
    return this.onlyoffice.getDocumentServerUrl();
  }

  /** Подписанный конфиг просмотра конкретного файла. */
  @Get('config/:fileId')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  config(@Param('fileId') fileId: string, @Req() req: AuthReq) {
    const name = [req.user?.last_name, req.user?.first_name].filter(Boolean).join(' ').trim();
    return this.onlyoffice.buildViewerConfig(fileId, {
      id: req.user?.user_id,
      name: name || req.user?.email || 'Пользователь',
    });
  }
}
