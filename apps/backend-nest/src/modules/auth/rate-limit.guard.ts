import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/** Общий счетчик на IP для POST login, verify-2fa и resend-code (каждый запрос увеличивает счетчик). */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 минут
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // очистка каждые 5 минут

interface Attempt {
  count: number;
  firstAttemptAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, Attempt>();

  constructor() {
    setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = this.getIp(req);
    const now = Date.now();

    const attempt = this.attempts.get(ip);

    if (!attempt || now - attempt.firstAttemptAt > WINDOW_MS) {
      this.attempts.set(ip, { count: 1, firstAttemptAt: now });
      return true;
    }

    if (attempt.count >= MAX_ATTEMPTS) {
      const retryAfterMs = WINDOW_MS - (now - attempt.firstAttemptAt);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      const text = `Слишком много попыток. Повторите через ${retryAfterSec} сек.`;
      throw new HttpException(
        { message: text, error: text, retryAfter: retryAfterSec },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    attempt.count++;
    return true;
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  resetForRequest(req: Request): void {
    this.reset(this.getIp(req));
  }

  private getIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
    return req.headers['x-real-ip'] as string || req.socket.remoteAddress || 'unknown';
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, attempt] of this.attempts) {
      if (now - attempt.firstAttemptAt > WINDOW_MS) {
        this.attempts.delete(ip);
      }
    }
  }
}
