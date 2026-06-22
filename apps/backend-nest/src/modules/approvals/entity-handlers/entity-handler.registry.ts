import { BadRequestException, Injectable } from '@nestjs/common';
import { ContractEntityHandler } from './contract.handler';
import { PartnerEntityHandler } from './partner.handler';
import { PatentEntityHandler } from './patent.handler';
import { ProjectEntityHandler } from './project.handler';
import type { EntityHandler } from './entity-handler.interface';

/** Реестр стратегий по коду типа сущности. */
@Injectable()
export class EntityHandlerRegistry {
  private readonly handlers: Map<string, EntityHandler>;

  constructor(
    contract: ContractEntityHandler,
    partner: PartnerEntityHandler,
    patent: PatentEntityHandler,
    project: ProjectEntityHandler,
  ) {
    this.handlers = new Map(
      [contract, partner, patent, project].map((h) => [h.entityType, h]),
    );
  }

  get(entityType: string): EntityHandler {
    const handler = this.handlers.get(entityType);
    if (!handler) {
      throw new BadRequestException(`Тип сущности '${entityType}' не поддерживает согласование`);
    }
    return handler;
  }

  has(entityType: string): boolean {
    return this.handlers.has(entityType);
  }
}
