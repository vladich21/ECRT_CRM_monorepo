import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { ChangeSwDocumentStatusDto, UpdateSwDocumentDto } from '../dto/sw-registry.dto';
import { SwDocumentsService } from '../services/sw-documents.service';

type AuthReq = Request & { user?: { user_id?: string } };

@Controller('sw/documents')
export class SwDocumentsController {
  constructor(private readonly documents: SwDocumentsService) {}

  // 4 сегмента после /api — иначе FilesController перехватит GET (3 сегмента).
  @Get('detail/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  getById(@Param('id') id: string) {
    return this.documents.getById(id);
  }

  @Patch('detail/:id')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  update(@Param('id') id: string, @Body('body') dto: UpdateSwDocumentDto, @Req() req: AuthReq) {
    return this.documents.update(id, dto, req.user?.user_id);
  }

  @Get('detail/:id/statuses')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  listStatuses(@Param('id') id: string) {
    return this.documents.listStatuses(id);
  }

  @Post('detail/:id/status')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  changeStatus(@Param('id') id: string, @Body('body') dto: ChangeSwDocumentStatusDto, @Req() req: AuthReq) {
    return this.documents.changeStatus(id, dto, req.user?.user_id);
  }

  @Post('detail/:id/archive')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  archive(@Param('id') id: string) {
    return this.documents.archive(id);
  }

  @Post('detail/:id/restore')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  restore(@Param('id') id: string) {
    return this.documents.restore(id);
  }

  @Post('detail/:id/mark-deleted')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  markDeleted(@Param('id') id: string) {
    return this.documents.markDeleted(id);
  }
}
