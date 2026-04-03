import { Injectable, OnModuleInit, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  pool: Pool;
  db: DrizzleDb;

  constructor(private config: ConfigService) {
    const connectionString = this.config.get<string>('DATABASE_URL');
    if (!connectionString) {
      this.logger.error('DATABASE_URL не задан в переменных окружения');
      throw new Error('DATABASE_URL is required');
    }

    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema });

    this.pool.on('error', (err) => {
      this.logger.error('Ошибка подключения к БД', err);
    });
  }

  async onModuleInit() {
    try {
      await this.pool.query('SELECT 1');
    } catch (error) {
      this.logger.error(' Не удалось подключиться к БД', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
