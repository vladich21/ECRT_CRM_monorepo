import { Injectable, Logger } from '@nestjs/common';

/**
 * Глобальный счетчик версии прав.
 *
 * При любом изменении ролей/прав вызывается bump() — у клиентов в JWT
 * остается старый pv, при следующем запросе JwtGuard видит несоответствие
 * и перевыпускает токен с актуальным snapshot прав.
 *
 * In-memory: подходит для одного инстанса API. При горизонтальном
 * масштабировании необходимо выносить в Redis/БД.
 */
@Injectable()
export class PermissionsVersionService {
  private readonly logger = new Logger(PermissionsVersionService.name);
  private version: number = Date.now();

  bump(): number {
    this.version++;
    this.logger.log(`Permissions version bumped → ${this.version}`);
    return this.version;
  }

  get(): number {
    return this.version;
  }
}
