import { Body, Controller, Get, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { UsersService } from '../services/users.service';
import { parsePagination } from '../../../common/pagination';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(
    @Query('preview') preview?: string,
    @Query('full') full?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const previewMode = preview === '1' ? 'active' : preview === '2' ? 'all' : 'full';
    const useFullFormat = full === '1' || full === 'true';
    const pagination = parsePagination(limit, offset);
    return this.usersService.findAll(previewMode, useFullFormat, pagination);
  }

  @Get('by-email/:email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    return user ? [user] : [];
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    return user ? [user] : [];
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body('body') body?: Record<string, unknown>) {
    const user = await this.usersService.update(id, body ?? {});
    if (!user) throw new NotFoundException(`Пользователь ${id} не найден`);
    return [user];
  }
}
