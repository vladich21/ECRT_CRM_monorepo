import { and, asc, eq } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { roles } from '../../../database/schema';
import { RoleResponseDto } from '../dto/role-response.dto';

/**
 * Read-only справочник ролей для use-case'ов «выбрать роль» (фильтр в списке
 * пользователей, мульти-селект и т.п.). CRUD ролей — в AdminRbacController.
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll(preview?: boolean): Promise<RoleResponseDto[] | Record<string, unknown>[]> {
    const rows = await this.db.db
      .select()
      .from(roles)
      .where(eq(roles.isActive, true))
      .orderBy(asc(roles.name));

    if (preview) {
      return rows.map((row) => ({
        id: String(row.id),
        role_name: String(row.name ?? ''),
      }));
    }
    return rows.map((row) => ({
      id: String(row.id),
      role_name: String(row.name ?? ''),
      name: String(row.name ?? ''),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    }));
  }

  async findOne(id: string): Promise<RoleResponseDto | Record<string, unknown> | null> {
    const rows = await this.db.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, id), eq(roles.isActive, true)))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      role_name: String(row.name ?? ''),
      name: String(row.name ?? ''),
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    };
  }
}
