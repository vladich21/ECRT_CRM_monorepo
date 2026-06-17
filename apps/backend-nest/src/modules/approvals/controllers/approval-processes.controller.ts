import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import type { SectionPermission } from '../../../shared/permissions';
import { ApprovalEngineService } from '../services/approval-engine.service';
import { ApprovalStateService } from '../services/approval-state.service';
import { StartProcessDto } from '../dto/start-process.dto';
import { MakeDecisionDto, ResubmitDto } from '../dto/make-decision.dto';
import { ALLOWED_MIME_TYPES } from '../../files/constants/file-formats';

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

  /**
   * Повторная отправка после доработки. Multipart: comment + keepFileIds (JSON-массив
   * id переносимых текущих документов) + новые/заменяющие файлы версии N+1.
   * keepFileIds отсутствует → переносим все текущие (безопасный дефолт).
   */
  @Post('processes/:id/resubmit')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (_req, file, cb) => {
        if (file.originalname && typeof file.originalname === 'string') {
          try {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch {
            // keep as-is on error
          }
        }
        const mime = file.mimetype || 'application/octet-stream';
        if (!ALLOWED_MIME_TYPES.has(mime)) {
          return cb(
            new Error(`Формат файла "${file.originalname}" не поддерживается.`),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async resubmit(
    @Param('id') id: string,
    @UploadedFiles() uploadedFiles: Express.Multer.File[],
    @Req() req: ReqUser,
  ) {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const comment = typeof body.comment === 'string' ? body.comment : undefined;

    let keepFileIds: string[] | null = null;
    if (typeof body.keepFileIds === 'string' && body.keepFileIds.trim() !== '') {
      try {
        const parsed: unknown = JSON.parse(body.keepFileIds);
        if (Array.isArray(parsed)) keepFileIds = parsed.map((v) => String(v));
      } catch {
        // невалидный JSON → keepFileIds = null (перенести все текущие)
      }
    }

    const dto: ResubmitDto = { comment };
    return [
      await this.engine.resubmit(id, dto, req.user!.user_id!, {
        keepFileIds,
        uploadedFiles: uploadedFiles ?? [],
      }),
    ];
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
