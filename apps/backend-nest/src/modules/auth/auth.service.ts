import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Client } from 'ldapts';
import { UsersService } from '../users/services/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async login(login: string, pass: string) {
    await this.ldapCheck(login, pass);

    const user = await this.users.findOneByLogin(login);
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    if (!user.is_active) throw new UnauthorizedException('Пользователь неактивен');

    const token = this.jwt.sign({ user_id: user.id });
    return { status: 200, JWT: token, data: [user] };
  }

  private async ldapCheck(login: string, pass: string): Promise<void> {
    const url = this.config.get<string>('LDAP_URL')!;
    const baseDN = this.config.get<string>('LDAP_BASE_DN')!;
    const client = new Client({ url });

    try {
      // Начальный bind с кредами пользователя (ошибка игнорируется — так же как в Go)
      try { await client.bind(login, pass); } catch {}

      const { searchEntries } = await client.search(baseDN, {
        filter: `(&(objectClass=person)(uid=${login}))`,
      });

      if (!searchEntries.length) {
        throw new UnauthorizedException('Пользователь не найден в LDAP');
      }

      // Проверка пароля через bind с полным DN пользователя
      await client.bind(searchEntries[0].dn, pass);
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Ошибка аутентификации');
    } finally {
      await client.unbind().catch(() => {});
    }
  }
}
