import { Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApprovalTasksService } from '../services/approval-tasks.service';

type ReqUser = Request & { user?: { user_id?: string } };

@Controller('approvals')
export class ApprovalTasksController {
  constructor(private readonly tasks: ApprovalTasksService) {}

  @Get('tasks/my')
  myTasks(@Req() req: ReqUser) {
    return this.tasks.myTasks(req.user!.user_id!);
  }

  @Post('tasks/:id/complete')
  async complete(@Param('id') id: string, @Req() req: ReqUser) {
    return [await this.tasks.complete(id, req.user!.user_id!)];
  }
}
