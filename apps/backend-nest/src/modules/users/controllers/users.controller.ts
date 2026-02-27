import { Body, Controller, Get, NotFoundException, Param, Put, Query } from '@nestjs/common';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('preview') preview?: string, @Query('full') full?: string) {
    // preview=1: только активные, preview=2: все (для отображения ответственных в договорах)
    // full=1: полный формат (login, email, department, position, roles) — для таблицы пользователей
    const previewMode = preview === '1' ? 'active' : preview === '2' ? 'all' : 'full';
    const useFullFormat = full === '1' || full === 'true';
    return this.usersService.findAll(previewMode, useFullFormat);
  }

  @Get('by-login/:login')
  async findByLogin(@Param('login') login: string) {
    const user = await this.usersService.findByLogin(login);
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
