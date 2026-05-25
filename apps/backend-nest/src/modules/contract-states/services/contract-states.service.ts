import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { refContractStates } from '../../../database/schema';

@Injectable()
export class ContractStatesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const rows = await this.db.db.select().from(refContractStates);
    const filtered = rows.filter(row => !this.isRemovedExecutingContractState(row));
    filtered.sort((a, b) => {
      const ra = this.contractStateLifecycleRank(a.code ?? '', a.name ?? '');
      const rb = this.contractStateLifecycleRank(b.code ?? '', b.name ?? '');
      if (ra !== rb) return ra - rb;
      return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ru');
    });
    return filtered.map(row => ({
      id: String(row.id),
      name: row.name ?? '',
      code: row.code ?? '',
    }));
  }

  /**
   * Порядок жизненного цикла: черновик → согласование → … → подписан → закрыт.
   * Неизвестные состояния — в конце списка.
   */
  private contractStateLifecycleRank(codeRaw: string, nameRaw: string): number {
    const code = codeRaw.trim().toLowerCase();
    const name = nameRaw.trim().toLowerCase();

    const rankByCode: Record<string, number> = {
      draft: 10,
      on_approval: 20,
      rejected: 30,
      approved: 40,
      signed: 50,
      completed: 90,
      terminated: 90,
      closed: 90,
      clozed: 90,
    };
    const byCode = rankByCode[code];
    if (byCode !== undefined) return byCode;

    if (name.includes('чернов')) return 10;
    if (name.includes('на согласован')) return 20;
    if (name.includes('отклон')) return 30;
    if (name.includes('согласован') && !name.includes('на согласован')) return 40;
    if (name.includes('подписан')) return 50;
    if (name.includes('закрыт') || name.includes('расторг') || name.includes('заверш')) return 90;

    return 1000;
  }

  /** Состояние «Исполняется» убрано из продукта; не отдаем в списках даже до прогона миграции. */
  private isRemovedExecutingContractState(row: typeof refContractStates.$inferSelect): boolean {    const code = (row.code ?? '').trim().toLowerCase();
    const name = (row.name ?? '').trim().toLowerCase();
    return (
      code === 'executing' ||
      code === 'in_execution' ||
      code === 'in_progress' ||
      code === 'performance' ||
      name === 'исполняется'
    );
  }
}
