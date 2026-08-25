import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../services/files.service';
import { assertFileLinkAccessAllowed } from '../file-download-url';
import * as path from 'path';
import { ALLOWED_MIME_TYPES } from '../constants/file-formats';
import { Public } from '../../auth/public.decorator';
import { EntityParams } from '../decorators/entity-params.decorator';
import type { EntityParamsDto } from '../dto';
import { PrepareUploadDto } from '../dto/prepare-upload.dto';
import { UpdateFileMetaDto } from '../dto/update-file-meta.dto';
@Controller()
export class FilesController {
  constructor(
    private readonly service: FilesService,
    private readonly config: ConfigService,
  ) {}

  /** Клиент (`apiClient`) шлет `{ body: { ... } }`; поддерживаем и плоское тело для совместимости. */
  private parseUpdateFileMetaFromRequest(reqBody: unknown): UpdateFileMetaDto {
    const raw =
      reqBody != null && typeof reqBody === 'object' && !Array.isArray(reqBody)
        ? (reqBody as Record<string, unknown>)
        : {};
    const inner =
      raw.body != null && typeof raw.body === 'object' && !Array.isArray(raw.body)
        ? (raw.body as Record<string, unknown>)
        : raw;
    const dto = plainToInstance(UpdateFileMetaDto, inner);
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      const messages = errors.flatMap(e => (e.constraints ? Object.values(e.constraints) : []));
      throw new BadRequestException(
        messages.length > 0 ? messages.join('; ') : 'Некорректное тело запроса',
      );
    }
    return dto;
  }

  /**
   * Новый контур (files-service): метаданные + tus-реквизиты.
   * Legacy POST /upload (multer → диск) остаётся рядом — strangler, не big-bang.
   */
  @Post('upload/prepare')
  async prepareUpload(
    @Body() body: PrepareUploadDto | { body?: PrepareUploadDto },
    @Req() req: Request & { user?: { user_id?: string } },
  ) {
    const dto = this.parsePrepareUploadBody(body);
    return this.service.prepareRemoteUpload(dto, req.user?.user_id);
  }

  @Post('upload/complete/:fileId')
  async completeUpload(@Param('fileId') fileId: string) {
    return this.service.completeRemoteUpload(fileId);
  }

  private parsePrepareUploadBody(
    body: PrepareUploadDto | { body?: PrepareUploadDto },
  ): PrepareUploadDto {
    const raw =
      body != null && typeof body === 'object' && 'body' in body && body.body != null
        ? body.body
        : body;
    const dto = plainToInstance(PrepareUploadDto, raw ?? {});
    const errors = validateSync(dto, { whitelist: true, forbidNonWhitelisted: false });
    if (errors.length > 0) {
      const messages = errors.flatMap((e) => (e.constraints ? Object.values(e.constraints) : []));
      throw new BadRequestException(
        messages.length > 0 ? messages.join('; ') : 'Некорректное тело запроса',
      );
    }
    return dto;
  }

  @Post('upload')
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
            new Error(
              `Формат файла "${file.originalname}" не поддерживается. Разрешены: PDF, Word, Excel, изображения, архивы, текст.`,
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request & { user?: { user_id?: string } },
  ) {
    const entityType = req.body?.entityType as string | undefined;
    const entityId = req.body?.entityId as string | undefined;
    if (!entityType || !entityId) {
      throw new BadRequestException('entityType и entityId обязательны');
    }
    const documentSection = req.body?.documentSection as string | undefined;
    const requestsMeta = this.parseRequestsUploadMeta(
      req.body as Record<string, string | boolean | undefined>,
    );
    return this.service.upload(
      files ?? [],
      entityType,
      entityId,
      req.user?.user_id,
      documentSection,
      requestsMeta,
    );
  }

  private parseRequestsUploadMeta(
    body: Record<string, string | boolean | undefined>,
  ): import('../services/files.service').PatentRequestsUploadMeta | null {
    if (body.documentSection !== 'requests') return null;
    const reqRaw = body.responseRequired;
    const responseRequired =
      reqRaw === true || reqRaw === 'true' || reqRaw === '1';
    const deadlineRaw = body.responseDeadline;
    let responseDeadline: Date | null = null;
    if (deadlineRaw != null && String(deadlineRaw).trim() !== '') {
      const d = new Date(String(deadlineRaw));
      if (!Number.isNaN(d.getTime())) {
        responseDeadline = d;
      }
    }
    return { responseRequired, responseDeadline };
  }

  @Get('files/:fileId')
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const remote = await this.service.resolveRemoteDownloadUrl(fileId);
    if (remote) {
      return res.redirect(remote.url);
    }
    const file = await this.service.resolvePublicFileDownload(fileId);
    if (!file) throw new NotFoundException(`Файл ${fileId} не найден`);
    return this.sendDownloadResponse(res, file);
  }

  @Public()
  @Get('files/public/:fileId')
  async servePublicFile(
    @Param('fileId') fileId: string,
    @Query('e') expiresAtRaw: string | undefined,
    @Query('s') signatureRaw: string | undefined,
    @Res() res: Response,
  ) {
    try {
      assertFileLinkAccessAllowed(this.config, fileId, expiresAtRaw, signatureRaw);
    } catch {
      throw new ForbiddenException('Ссылка на файл недействительна или устарела');
    }

    const remote = await this.service.resolveRemoteDownloadUrl(fileId);
    if (remote) {
      return res.redirect(remote.url);
    }
    const file = await this.service.resolvePublicFileDownload(fileId);
    if (!file) throw new NotFoundException('Файл не найден');
    return this.sendDownloadResponse(res, file);
  }

  private sendDownloadResponse(
    res: Response,
    file: { filePath: string; filename: string; mimeType: string },
  ) {
    let mimeType = file.mimeType;
    if (
      mimeType.startsWith('text/') ||
      ['application/json', 'application/xml'].includes(mimeType)
    ) {
      mimeType = `${mimeType}; charset=utf-8`;
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    );
    return res.sendFile(path.resolve(file.filePath));
  }

  @Get(':entityType/:entityId/files')
  getFilesByEntity(@EntityParams() params: EntityParamsDto) {
    return this.service.findByEntity(params.entityType, params.entityId);
  }

  @Delete(':entityType/:entityId/files/:fileId')
  async deleteFile(
    @EntityParams() params: EntityParamsDto,
    @Param('fileId') fileId: string,
  ) {
    const row = await this.service.remove(
      params.entityType,
      params.entityId,
      fileId,
    );
    if (!row) throw new NotFoundException(`Файл ${fileId} не найден`);
    return [row];
  }

  @Patch(':entityType/:entityId/files/:fileId')
  async patchFileMeta(
    @EntityParams() params: EntityParamsDto,
    @Param('fileId') fileId: string,
    @Req() req: Request,
  ) {
    const dto = this.parseUpdateFileMetaFromRequest(req.body);
    const row = await this.service.updateMeta(params.entityType, params.entityId, fileId, dto);
    if (!row) throw new NotFoundException(`Файл ${fileId} не найден`);
    return row;
  }

  @Public()
  @Get(':entityType/:entityId/:filename')
  async serveFile(
    @EntityParams() params: EntityParamsDto,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const decodedFilename = decodeURIComponent(filename);
    const filePath = this.service.getFilePath(
      params.entityType,
      params.entityId,
      decodedFilename,
    );
    if (!filePath) throw new NotFoundException('Файл не найден');

    let mimeType = this.service.getMimeType(decodedFilename);
    if (
      mimeType.startsWith('text/') ||
      ['application/json', 'application/xml'].includes(mimeType)
    ) {
      mimeType = `${mimeType}; charset=utf-8`;
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename*=UTF-8''${encodeURIComponent(decodedFilename)}`,
    );
    return res.sendFile(path.resolve(filePath));
  }
}
