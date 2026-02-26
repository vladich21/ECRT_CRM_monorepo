import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { positions } from '../../../database/schema';
import { PositionResponseDto } from '../dto/position-response.dto';

@Injectable()
export class PositionsService {
  private readonly logger = new Logger(PositionsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean): Promise<PositionResponseDto[] | Record<string, unknown>[]> {
    this.logger.debug(`Получение должностей (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: positions.id, name: positions.name })
        .from(positions)
        .orderBy(asc(positions.name));
      return rows.map((r) => ({ id: String(r.id), name: String(r.name ?? '') }));
    }
    const rows = await this.db.db
      .select()
      .from(positions)
      .orderBy(asc(positions.name));
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findOne(id: string): Promise<PositionResponseDto | Record<string, unknown> | null> {
    this.logger.debug(`Получение должности по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      name: String(r.name ?? ''),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
