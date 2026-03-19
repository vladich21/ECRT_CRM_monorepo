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
      return rows.map((position) => ({ id: String(position.id), name: String(position.name ?? '') }));
    }
    const rows = await this.db.db
      .select()
      .from(positions)
      .orderBy(asc(positions.name));
    return rows.map((position) => ({
      id: String(position.id),
      name: String(position.name ?? ''),
      createdAt: position.createdAt,
      updatedAt: position.updatedAt,
    }));
  }

  async findOne(id: string): Promise<PositionResponseDto | Record<string, unknown> | null> {
    this.logger.debug(`Получение должности по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(positions)
      .where(eq(positions.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      name: String(row.name ?? ''),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
