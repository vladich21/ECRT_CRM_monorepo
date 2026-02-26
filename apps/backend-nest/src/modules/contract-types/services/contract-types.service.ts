import { asc } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refContractTypes } from '../../../database/schema';

@Injectable()
export class ContractTypesService {
  private readonly logger = new Logger(ContractTypesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение типов договоров');
    const rows = await this.db.db
      .select()
      .from(refContractTypes)
      .orderBy(asc(refContractTypes.name));
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name ?? '',
      description: row.description ?? '',
    }));
  }
}
