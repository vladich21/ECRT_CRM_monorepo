import { Controller, Delete, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { FilesService } from '../services/files.service';

@Controller()
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Get('files/:fileId')
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.service.findById(fileId);
    if (!file) throw new NotFoundException(`Файл ${fileId} не найден`);
    if (!file.url || file.url.includes('/api/files/')) {
      throw new NotFoundException(`Файл ${fileId} не найден или недоступен для скачивания`);
    }
    return res.redirect(302, file.url);
  }

  @Get('partners/:partnerId/files')
  getPartnerFiles(@Param('partnerId') partnerId: string) {
    return this.service.findByEntity('partner', partnerId);
  }

  @Delete('partners/:partnerId/files/:fileId')
  async deletePartnerFile(
    @Param('partnerId') partnerId: string,
    @Param('fileId') fileId: string,
  ) {
    const row = await this.service.remove('partner', partnerId, fileId);
    if (!row) throw new NotFoundException(`Файл ${fileId} не найден`);
    return [row];
  }

  @Get('contracts/:contractId/files')
  getContractFiles(@Param('contractId') contractId: string) {
    return this.service.findByEntity('contract', contractId);
  }

  @Delete('contracts/:contractId/files/:fileId')
  async deleteContractFile(
    @Param('contractId') contractId: string,
    @Param('fileId') fileId: string,
  ) {
    const row = await this.service.remove('contract', contractId, fileId);
    if (!row) throw new NotFoundException(`Файл ${fileId} не найден`);
    return [row];
  }
}
