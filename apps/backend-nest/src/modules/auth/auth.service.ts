import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify } from 'jose';
import { randomInt } from 'crypto';
import * as argon2 from 'argon2';
import { eq, and, isNull } from 'drizzle-orm';
import { Response } from 'express';
import { DatabaseService } from '../../database/database.service';
import { authCodes } from '../../database/schema';
import { UsersService } from '../users/services/users.service';
import { MailService } from './mail.service';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

const JWT_COOKIE = 'auth_token';
const JWT_TTL_SECONDS = 3 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly jwtSecret: Uint8Array;
  private readonly isProduction: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DatabaseService,
    private readonly users: UsersService,
    private readonly mail: MailService,
  ) {
    const secret = config.get<string>('JWT_SECRET') ?? '';
    this.jwtSecret = new TextEncoder().encode(secret);
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
  }

  async checkEmail(email: string) {
    const user = await this.users.getAuthDataByEmail(email);

    if (!user) throw new NotFoundException('Пользователь не найден');
    if (!user.isActive) throw new ForbiddenException('Учётная запись деактивирована');

    if (!user.passwordHash) {
      await this.sendCode(user.id, user.email, 'temp_password');
      return { tempCodeSent: true, email: this.maskEmail(user.email) };
    }

    return { hasPassword: true };
  }

  async verifyPassword(email: string, password: string) {
    const user = await this.users.getAuthDataByEmail(email);

    if (!user || !user.isActive) throw new UnauthorizedException('Неверный email или пароль');
    if (!user.passwordHash) throw new UnauthorizedException('Пароль не установлен');

    const valid = await argon2.verify(user.passwordHash, password, ARGON2_OPTIONS);
    if (!valid) throw new UnauthorizedException('Неверный email или пароль');

    if (user.mustChangePassword) return { mustChangePassword: true };

    // Когда появится админ-панель — заменить на: if (user.twoFactorEnabled !== false)
    await this.sendCode(user.id, user.email, '2fa');
    return { awaiting2FA: true, email: this.maskEmail(user.email) };
  }

  async verifyTempCode(email: string, code: string) {
    const user = await this.users.getAuthDataByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Пользователь не найден');

    await this.verifyCode(user.id, code, 'temp_password');
    await this.users.setMustChangePassword(user.id, true);
    return { mustChangePassword: true };
  }

  async verify2fa(email: string, code: string, res: Response) {
    const user = await this.users.getAuthDataByEmail(email);
    if (!user || !user.isActive) throw new UnauthorizedException('Пользователь не найден');

    await this.verifyCode(user.id, code, '2fa');
    await this.finishLogin(user.id, res);
    const userInfo = await this.users.findOne(user.id);
    return { success: true, user: userInfo };
  }

  async setPassword(email: string, password: string, confirmPassword: string, res: Response) {
    if (password !== confirmPassword) throw new BadRequestException('Пароли не совпадают');
    this.validatePassword(password);

    const user = await this.users.getAuthDataByEmail(email);
    if (!user || !user.isActive) throw new NotFoundException('Пользователь не найден или деактивирован');

    const hash = await argon2.hash(password, ARGON2_OPTIONS);
    await this.users.setPasswordHash(user.id, hash, false);

    await this.finishLogin(user.id, res);
    const userInfo = await this.users.findOne(user.id);
    return { success: true, user: userInfo };
  }

  logout(res: Response) {
    res.clearCookie(JWT_COOKIE, { path: '/' });
    return { success: true };
  }

  async getMe(userId: string) {
    const user = await this.users.findOne(userId);
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return { user };
  }

  async verifyJwt(token: string): Promise<{ user_id: string; exp?: number }> {
    const { payload } = await jwtVerify(token, this.jwtSecret);
    return { user_id: payload['user_id'] as string, exp: payload.exp };
  }

  async renewToken(userId: string, res: Response): Promise<void> {
    await this.setAuthCookie(userId, res);
  }

  // ─── Приватные ─────────────────────────────────────────────────────────────

  private async finishLogin(userId: string, res: Response): Promise<void> {
    await this.users.updateLastLogin(userId);
    await this.setAuthCookie(userId, res);
  }

  private async setAuthCookie(userId: string, res: Response): Promise<void> {
    const token = await this.signJwt(userId);
    res.cookie(JWT_COOKIE, token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: JWT_TTL_SECONDS * 1000,
      path: '/',
    });
  }

  private async signJwt(userId: string): Promise<string> {
    return new SignJWT({ user_id: userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${JWT_TTL_SECONDS}s`)
      .sign(this.jwtSecret);
  }

  private async sendCode(userId: string, email: string, type: 'temp_password' | '2fa'): Promise<void> {
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await argon2.hash(code, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.db.db.transaction(async (tx) => {
      await tx
        .update(authCodes)
        .set({ usedAt: new Date() })
        .where(and(eq(authCodes.userId, userId), eq(authCodes.type, type), isNull(authCodes.usedAt)));

      await tx.insert(authCodes).values({ userId, codeHash, type, expiresAt });
    });

    if (type === 'temp_password') await this.mail.sendTempCode(email, code);
    else await this.mail.send2faCode(email, code);
  }

  private async verifyCode(userId: string, code: string, type: 'temp_password' | '2fa'): Promise<void> {
    const rows = await this.db.db
      .select()
      .from(authCodes)
      .where(and(eq(authCodes.userId, userId), eq(authCodes.type, type), isNull(authCodes.usedAt)))
      .orderBy(authCodes.createdAt)
      .limit(10);

    const now = new Date();
    for (const row of rows) {
      if (row.expiresAt < now) continue;
      const match = await argon2.verify(row.codeHash, code, ARGON2_OPTIONS);
      if (match) {
        await this.db.db.update(authCodes).set({ usedAt: now }).where(eq(authCodes.id, row.id));
        return;
      }
    }

    const hasExpired = rows.some((row) => row.expiresAt < now);
    if (hasExpired) throw new UnauthorizedException('Код истёк, запросите новый');
    throw new UnauthorizedException('Неверный код');
  }

  private validatePassword(password: string): void {
    if (password.length < 10) throw new BadRequestException('Пароль должен быть не менее 10 символов');
    if (!/[A-ZА-ЯЁ]/.test(password)) throw new BadRequestException('Пароль должен содержать минимум 1 заглавную букву');
    if (!/\d/.test(password)) throw new BadRequestException('Пароль должен содержать минимум 1 цифру');
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!domain) return email;
    return `${local[0]}***@${domain}`;
  }
}
