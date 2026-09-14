import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermission } from '../permissions/decorators/permission-meta';
import { SECTIONS } from '../../shared/permissions';
import { SvnAttachService } from './svn-attach.service';
import { SvnClient } from './svn.client';

type AuthReq = Request & { user?: { user_id?: string } };

/**
 * Файлы документации из SVN конструкторов.
 *
 * Путь из четырёх сегментов: трёхсегментные перехватывает FilesController
 * со своим ':entityType/:entityId/:filename'.
 */
@Controller('sw/registry/svn')
export class SvnController {
  constructor(
    private readonly svn: SvnClient,
    private readonly attachService: SvnAttachService,
  ) {}

  /** Доступен ли обзор SVN — по этому фронт решает, показывать ли кнопку. */
  @Get('status')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  status() {
    return { enabled: this.svn.isEnabled() };
  }

  /** Содержимое каталога репозитория: дерево грузится по одному уровню. */
  @Get('browse')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  browse(@Query('path') path = '') {
    return this.svn.list(path);
  }

  /** Текущие ревизии файлов в SVN — чтобы показать, где копия в реестре отстала. */
  @Post('revisions')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  revisions(@Body() dto: { paths: string[] }) {
    return this.svn.currentRevisions(dto?.paths ?? []);
  }

  /** Привязка программы к её каталогу в SVN. */
  @Post('link')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  link(@Body() dto: { itemId: string; path: string }) {
    return this.attachService.linkFolder(dto.itemId, dto.path ?? '');
  }

  /** Каталог программы в сопоставлении с её комплектом документации. */
  @Get('folder')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  folder(@Query('itemId') itemId: string) {
    return this.attachService.folderState(itemId);
  }

  /** Перенос выбранного файла в реестр. */
  @Post('attach')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  attach(
    @Body() dto: { objectType: string; objectId: string; path: string },
    @Req() req: AuthReq,
  ) {
    return this.attachService.attach({
      objectType: dto.objectType,
      objectId: dto.objectId,
      path: dto.path,
      userId: req.user?.user_id ?? '',
    });
  }
}
