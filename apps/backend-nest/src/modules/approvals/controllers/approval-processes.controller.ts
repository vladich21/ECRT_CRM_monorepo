import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { SectionPermission } from '../../../shared/permissions';
import { ApprovalEngineService } from '../services/approval-engine.service';
import { ApprovalStateService } from '../services/approval-state.service';
import { StartProcessDto } from '../dto/start-process.dto';
import { MakeDecisionDto, ResubmitDto } from '../dto/make-decision.dto';

type ReqUser = Request & {
  user?: { user_id?: string; sectionPermissions?: SectionPermission[] };
};

@Controller('approvals')
export class ApprovalProcessesController {
  constructor(
    private readonly engine: ApprovalEngineService,
    private readonly state: ApprovalStateService,
  ) {}

  @Get('state')
  getState(
    @Query('entity_type') entityType: string,
    @Query('entity_id') entityId: string,
    @Req() req: ReqUser,
  ) {
    return this.state.getDocumentApprovalState(
      entityType,
      entityId,
      req.user!.user_id!,
      req.user?.sectionPermissions,
    );
  }

  @Get('my-tasks')
  async myTasks(@Query('count_only') countOnly: string | undefined, @Req() req: ReqUser) {
    const userId = req.user!.user_id!;
    if (countOnly) {
      return { count: await this.state.myTasksCount(userId) };
    }
    return this.state.myTasks(userId);
  }

  @Get('my-initiated')
  myInitiated(@Req() req: ReqUser) {
    return this.state.myInitiated(req.user!.user_id!);
  }

  @Get('my-participated')
  myParticipated(@Req() req: ReqUser) {
    return this.state.myParticipated(req.user!.user_id!);
  }

  @Post('processes')
  async start(@Body('body') dto: StartProcessDto, @Req() req: ReqUser) {
    const row = await this.engine.startApprovalProcess(
      dto,
      req.user!.user_id!,
      req.user?.sectionPermissions,
    );
    return [row];
  }

  @Get('processes/:id')
  get(@Param('id') id: string, @Req() req: ReqUser) {
    return this.state.getProcessForUser(id, req.user!.user_id!, req.user?.sectionPermissions);
  }

  @Post('processes/:id/decision')
  async decision(@Param('id') id: string, @Body('body') dto: MakeDecisionDto, @Req() req: ReqUser) {
    return [await this.engine.makeDecision(id, dto, req.user!.user_id!)];
  }

  @Post('processes/:id/resubmit')
  async resubmit(@Param('id') id: string, @Body('body') dto: ResubmitDto, @Req() req: ReqUser) {
    return [await this.engine.resubmit(id, dto ?? {}, req.user!.user_id!)];
  }

  @Delete('processes/:id')
  async cancel(
    @Param('id') id: string,
    @Query('comment') comment: string | undefined,
    @Req() req: ReqUser,
  ) {
    return this.engine.cancel(id, comment, req.user!.user_id!);
  }
}
