import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { FilesService } from '../services/files.service';
import * as path from 'path';
import { ALLOWED_MIME_TYPES } from '../constants/file-formats';
import { Public } from '../../auth/public.decorator';

@Controller()
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post('upload')
  @UseInterceptors(
    AnyFilesInterceptor({
      fileFilter: (_req, file, cb) => {
        if (file.originalname && typeof file.originalname === 'string') {
          try {
            file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          } catch {
            // оставляем как есть при ошибке
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
    const uploadedById = req.user?.user_id;
    const result = await this.service.upload(files ?? [], entityType, entityId, uploadedById);
    return result;
  }

  @Get('files/:fileId')
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.service.findById(fileId);
    if (!file) throw new NotFoundException(`Файл ${fileId} не найден`);
    if (!file.url || file.url.endsWith(`/files/${fileId}`)) {
      throw new NotFoundException(`Файл ${fileId} недоступен для скачивания`);
    }
    return res.redirect(302, file.url);
  }

  @Get(':entityType/:entityId/files')
  getFilesByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const singular = entityType.replace(/s$/, '') || entityType;
    return this.service.findByEntity(singular, entityId);
  }

  @Delete(':entityType/:entityId/files/:fileId')
  async deleteFile(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('fileId') fileId: string,
  ) {
    const singular = entityType.replace(/s$/, '') || entityType;
    const row = await this.service.remove(singular, entityId, fileId);
    if (!row) throw new NotFoundException(`Файл ${fileId} не найден`);
    return [row];
  }

  @Public()
  @Get(':entityType/:entityId/:filename')
  async serveFile(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const decodedFilename = decodeURIComponent(filename);
    const filePath = this.service.getFilePath(entityType, entityId, decodedFilename);
    if (!filePath) {
      throw new NotFoundException('Файл не найден');
    }
    let mimeType = this.service.getMimeType(decodedFilename);
    if (mimeType.startsWith('text/') || ['application/json', 'application/xml'].includes(mimeType)) {
      mimeType = `${mimeType}; charset=utf-8`;
    }
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(decodedFilename)}`);
    return res.sendFile(path.resolve(filePath));
  }
}
