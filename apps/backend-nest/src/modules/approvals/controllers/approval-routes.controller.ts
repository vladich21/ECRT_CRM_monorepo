import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { ApprovalRoutesService } from '../services/approval-routes.service';
import { CreateRouteDto, ReplaceStepsDto, UpdateRouteDto } from '../dto/route.dto';

type ReqUser = Request & { user?: { user_id?: string } };

@Controller('approvals')
export class ApprovalRoutesController {
  constructor(private readonly routes: ApprovalRoutesService) {}

  @Get('references/entity-types')
  entityTypes() {
    return this.routes.listReferencesEntityTypes();
  }

  @Get('references/step-roles')
  stepRoles() {
    return this.routes.listReferencesStepRoles();
  }

  @Get('routes')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'read')
  list(@Query('entity_type') entityType?: string) {
    return this.routes.list(entityType);
  }

  @Post('routes')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'edit')
  async create(@Body('body') dto: CreateRouteDto, @Req() req: ReqUser) {
    return [await this.routes.create(dto, req.user!.user_id!)];
  }

  @Get('routes/:id')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'read')
  get(@Param('id') id: string) {
    return this.routes.getById(id);
  }

  @Put('routes/:id')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'edit')
  async update(@Param('id') id: string, @Body('body') dto: UpdateRouteDto, @Req() req: ReqUser) {
    return [await this.routes.update(id, dto, req.user!.user_id!)];
  }

  @Delete('routes/:id')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'delete')
  remove(@Param('id') id: string) {
    return this.routes.remove(id);
  }

  @Get('routes/:id/steps')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'read')
  steps(@Param('id') id: string) {
    return this.routes.getSteps(id);
  }

  @Put('routes/:id/steps')
  @RequirePermission(SECTIONS.ADMIN_APPROVAL_ROUTES, 'edit')
  replaceSteps(@Param('id') id: string, @Body('body') dto: ReplaceStepsDto) {
    return this.routes.replaceSteps(id, dto);
  }

  @Get('routes/:id/start-info')
  startInfo(@Param('id') id: string) {
    return this.routes.getStartInfo(id);
  }
}
