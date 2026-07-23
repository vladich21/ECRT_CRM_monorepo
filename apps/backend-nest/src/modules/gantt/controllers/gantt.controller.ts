import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';

import { GanttService } from '../services/gantt.service';

@Controller('gantt')
export class GanttController {
  constructor(private readonly service: GanttService) {}

  /** Project → Contract → Stage → Task дерево для диаграммы. */
  @Get('hierarchy')
  getHierarchy() {
    return this.service.getHierarchy();
  }

  /** Список задач (для таймшита: ?user_id=&from=&to=&status=). */
  @Get('tasks')
  listTasks(
    @Query('user_id') userId?: string,
    @Query('stage_id') stageId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listTasks({
      userId: userId || undefined,
      stageId: stageId || undefined,
      from: from || undefined,
      to: to || undefined,
      status: status || undefined,
    });
  }

  @Get('tasks/:id')
  getTask(@Param('id') id: string) {
    return this.service.getTask(id);
  }

  @Post('tasks')
  createTask(@Body('body') body?: Record<string, unknown>, @Req() req?: { user?: { id?: string } }) {
    return this.service.createTask(body ?? {}, req?.user?.id);
  }

  @Put('tasks/:id')
  updateTask(
    @Param('id') id: string,
    @Body('body') body?: Record<string, unknown>,
    @Req() req?: { user?: { id?: string } },
  ) {
    return this.service.updateTask(id, body ?? {}, req?.user?.id);
  }

  @Delete('tasks/:id')
  deleteTask(@Param('id') id: string) {
    return this.service.deleteTask(id);
  }

  @Post('tasks/:id/time-entries')
  createTimeEntry(
    @Param('id') taskId: string,
    @Body('body') body?: Record<string, unknown>,
  ) {
    return this.service.createTimeEntry(taskId, body ?? {});
  }

  @Put('time-entries/:id')
  updateTimeEntry(
    @Param('id') id: string,
    @Body('body') body?: Record<string, unknown>,
  ) {
    return this.service.updateTimeEntry(id, body ?? {});
  }

  @Delete('time-entries/:id')
  deleteTimeEntry(@Param('id') id: string) {
    return this.service.deleteTimeEntry(id);
  }

  @Post('links')
  createLink(@Body('body') body?: Record<string, unknown>) {
    return this.service.createLink(body ?? {});
  }

  @Delete('links/:id')
  deleteLink(@Param('id') id: string) {
    return this.service.deleteLink(id);
  }
}
