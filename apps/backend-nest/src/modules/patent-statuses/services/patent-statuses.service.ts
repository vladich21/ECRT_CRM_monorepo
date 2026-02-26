import { asc } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refPatentStatuses } from '../../../database/schema';

@Injectable()
export class PatentStatusesService {
  private readonly logger = new Logger(PatentStatusesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение статусов патентов');
    const rows = await this.db.db
      .select()
      .from(refPatentStatuses)
      .orderBy(asc(refPatentStatuses.name));
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name ?? '',
    }));
  }
}
