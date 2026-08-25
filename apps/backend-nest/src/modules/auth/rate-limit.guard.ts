import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/** Прод по умолчанию: 5 попыток / 15 мин. Стейдж задаёт мягче через AUTH_RATE_LIMIT_*. */
const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

interface Attempt {
  count: number;
  firstAttemptAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly attempts = new Map<string, Attempt>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(config: ConfigService) {
    this.maxAttempts = Math.max(
      1,
      parseInt(config.get('AUTH_RATE_LIMIT_MAX') ?? '', 10) || DEFAULT_MAX_ATTEMPTS,
    );
    this.windowMs = Math.max(
      1000,
      parseInt(config.get('AUTH_RATE_LIMIT_WINDOW_MS') ?? '', 10) || DEFAULT_WINDOW_MS,
    );
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupTimer);
  }

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const ip = this.getIp(req);
    const now = Date.now();

    const attempt = this.attempts.get(ip);

    if (!attempt || now - attempt.firstAttemptAt > this.windowMs) {
      this.attempts.set(ip, { count: 1, firstAttemptAt: now });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      const retryAfterMs = this.windowMs - (now - attempt.firstAttemptAt);
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
      if (now - attempt.firstAttemptAt > this.windowMs) {
        this.attempts.delete(ip);
      }
    }
  }
}
