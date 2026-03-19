import { asc } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refContractStates } from '../../../database/schema';

@Injectable()
export class ContractStatesService {
  private readonly logger = new Logger(ContractStatesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение состояний договоров');
    const rows = await this.db.db
      .select()
      .from(refContractStates)
      .orderBy(asc(refContractStates.name));
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name ?? '',
      code: row.code ?? '',
    }));
  }
}
