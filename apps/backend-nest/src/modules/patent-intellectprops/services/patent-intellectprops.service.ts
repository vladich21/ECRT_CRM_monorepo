import { asc } from 'drizzle-orm';
import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refIntellectualPropertyTypes } from '../../../database/schema';

@Injectable()
export class PatentIntellectpropsService {
  private readonly logger = new Logger(PatentIntellectpropsService.name);

  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    this.logger.debug('Получение типов объектов интеллектуальной собственности');
    const rows = await this.db.db
      .select()
      .from(refIntellectualPropertyTypes)
      .orderBy(asc(refIntellectualPropertyTypes.name));
    return rows.map((row) => ({
      id: String(row.id),
      name: row.name ?? '',
    }));
  }
}
