import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refGroups } from '../../../database/schema';
import { RoleResponseDto } from '../dto/role-response.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean): Promise<RoleResponseDto[] | Record<string, unknown>[]> {
    this.logger.debug(`Получение ролей (preview=${preview})`);
    if (preview) {
      const rows = await this.db.db
        .select({ id: refGroups.id, name: refGroups.name })
        .from(refGroups)
        .orderBy(asc(refGroups.name));
      return rows.map((r) => ({
        id: String(r.id),
        role_name: String(r.name ?? ''),
      }));
    }
    const rows = await this.db.db
      .select()
      .from(refGroups)
      .orderBy(asc(refGroups.name));
    return rows.map((r) => ({
      id: String(r.id),
      role_name: String(r.name ?? ''),
      name: String(r.name ?? ''),
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    }));
  }

  async findOne(id: string): Promise<RoleResponseDto | Record<string, unknown> | null> {
    this.logger.debug(`Получение роли по id: ${id}`);
    const rows = await this.db.db
      .select()
      .from(refGroups)
      .where(eq(refGroups.id, id))
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      role_name: String(r.name ?? ''),
      name: String(r.name ?? ''),
      created_at: r.createdAt,
      updated_at: r.updatedAt,
    };
  }
}
