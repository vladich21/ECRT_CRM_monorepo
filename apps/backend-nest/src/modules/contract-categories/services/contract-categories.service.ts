import { asc } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refContractCategories } from '../../../database/schema';

@Injectable()
export class ContractCategoriesService {
  private readonly logger = new Logger(ContractCategoriesService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение категорий договоров');
    const rows = await this.db.db
      .select()
      .from(refContractCategories)
      .orderBy(asc(refContractCategories.name));
    return rows.map((r) => ({
      id: String(r.id),
      name: r.name ?? '',
    }));
  }
}
