import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { BodyPayload } from '../../../shared/decorators/body-payload.decorator';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import {
  SwFileConfirmDto,
  SwFileTicketDto,
  SwFileVersionTicketDto,
} from '../dto/sw-registry.dto';
import { SwFilesService } from '../services/sw-files.service';

type AuthReq = Request & { user?: { user_id?: string } };

/** Контракт §7.3: обратный индекс sw_files + files-service. Префикс sw/files — ≥3 сегментов, не ловится FilesController. */
@Controller('sw/files')
export class SwFilesController {
  constructor(private readonly files: SwFilesService) {}

  @Post('ticket')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  createTicket(@BodyPayload() dto: SwFileTicketDto, @Req() req: AuthReq) {
    return this.files.createTicket(dto, req.user?.user_id);
  }

  @Post(':fileId/version-ticket')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  createVersionTicket(
    @Param('fileId') fileId: string,
    @BodyPayload() dto: SwFileVersionTicketDto,
    @Req() req: AuthReq,
  ) {
    return this.files.createVersionTicket(fileId, dto, req.user?.user_id);
  }

  @Post(':fileId/confirm')
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  confirm(@Param('fileId') fileId: string, @BodyPayload() dto: SwFileConfirmDto, @Req() req: AuthReq) {
    return this.files.confirm(fileId, dto, req.user?.user_id);
  }

  @Get()
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  list(@Query('objectType') objectType: string, @Query('objectId') objectId: string) {
    return this.files.list(objectType, objectId);
  }

  @Get(':fileId/link')
  @RequirePermission(SECTIONS.SW_ITEMS, 'read')
  getLink(@Param('fileId') fileId: string, @Query('version') version?: string) {
    const versionNum = version != null && version !== '' ? Number(version) : undefined;
    return this.files.getLink(fileId, Number.isFinite(versionNum) ? versionNum : undefined);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermission(SECTIONS.SW_ITEMS, 'edit')
  async detach(@Param('id') id: string) {
    await this.files.detach(id);
  }
}
