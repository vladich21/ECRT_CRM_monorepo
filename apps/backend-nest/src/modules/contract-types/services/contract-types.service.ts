import { asc, eq } from 'drizzle-orm';
import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refContractTypes } from '../../../database/schema';

function isPgForeignKeyViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const cause = (err as { cause?: { code?: string } }).cause;
  return cause?.code === '23503';
}

@Injectable()
export class ContractTypesService {
  private readonly logger = new Logger(ContractTypesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const rows = await this.db.db
      .select()
      .from(refContractTypes)
      .orderBy(asc(refContractTypes.name));
    return rows.map((row) => ({
      id: row.id,
      name: row.name ?? '',
      description: row.description ?? '',
    }));
  }

  async create(data: { name: string; description?: string }) {
    const [row] = await this.db.db
      .insert(refContractTypes)
      .values({ name: data.name, description: data.description ?? null })
      .returning();
    return { id: row.id, name: row.name ?? '', description: row.description ?? '' };
  }

  async update(id: string, data: { name?: string; description?: string }) {
    const [row] = await this.db.db
      .update(refContractTypes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(refContractTypes.id, id))
      .returning();

    if (!row) throw new NotFoundException('Тип договора не найден');
    return { id: row.id, name: row.name ?? '', description: row.description ?? '' };
  }

  async remove(id: string) {
    try {
      const [row] = await this.db.db
        .delete(refContractTypes)
        .where(eq(refContractTypes.id, id))
        .returning();

      if (!row) throw new NotFoundException('Тип договора не найден');
      return { success: true };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (isPgForeignKeyViolation(err)) {
        throw new ConflictException('Нельзя удалить тип договора - он используется в существующих договорах');
      }
      throw err;
    }
  }
}
