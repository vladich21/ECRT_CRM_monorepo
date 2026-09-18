import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { BodyPayload } from '../../../shared/decorators/body-payload.decorator';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { AddStructureResponsibleDto, CreateStructureElementDto, UpdateStructureElementDto } from '../dto/sw-registry.dto';
import { SwStructureService } from '../services/sw-structure.service';

type AuthReq = Request & { user?: { user_id?: string } };

@Controller('sw/structure')
export class SwStructureController {
  constructor(private readonly service: SwStructureService) {}

  @Get()
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'read')
  list(@Query('parentId') parentId?: string, @Query('recordState') recordState?: string) {
    return this.service.listTree(parentId, recordState || 'active');
  }

  @Get('detail/:id/patents')
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'read')
  listPatentLinks(@Param('id') id: string) {
    return this.service.listPatentLinksForElement(id);
  }

  @Post()
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  create(@BodyPayload() dto: CreateStructureElementDto, @Req() req: AuthReq) {
    return this.service.create(dto, req.user?.user_id);
  }

  @Patch(':id')
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  update(@Param('id') id: string, @BodyPayload() dto: UpdateStructureElementDto, @Req() req: AuthReq) {
    return this.service.update(id, dto, req.user?.user_id);
  }

  @Post(':id/archive')
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  archive(@Param('id') id: string) {
    return this.service.archive(id);
  }

  @Post(':id/restore')
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  @Post(':id/mark-deleted')
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  markDeleted(@Param('id') id: string) {
    return this.service.markDeleted(id);
  }

  @Post(':id/responsibles')
  @HttpCode(201)
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'edit')
  addResponsible(@Param('id') id: string, @BodyPayload() dto: AddStructureResponsibleDto) {
    return this.service.addResponsible(id, dto);
  }

  @Delete(':id/responsibles/:userId/:roleCode')
  @HttpCode(204)
  @RequirePermission(SECTIONS.SW_STRUCTURE, 'delete')
  async removeResponsible(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('roleCode') roleCode: string,
  ) {
    await this.service.removeResponsible(id, userId, roleCode);
  }
}
