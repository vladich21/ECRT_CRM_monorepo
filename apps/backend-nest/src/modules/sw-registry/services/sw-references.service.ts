import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { DatabaseService } from '../../../database/database.service';
import {
  swRefDevelopmentKinds,
  swRefDocumentKinds,
  swRefElementTypes,
  swRefResponsibilityRoles,
  swRefStatusApplicability,
  swRefStatuses,
} from '../sw-registry.schema';

const KINDS = [
  'elementTypes',
  'responsibilityRoles',
  'developmentKinds',
  'documentKinds',
  'statuses',
  'statusApplicability',
] as const;

export type SwReferenceKind = (typeof KINDS)[number];

@Injectable()
export class SwReferencesService {
  constructor(private readonly db: DatabaseService) {}

  async list(kind: string) {
    if (!KINDS.includes(kind as SwReferenceKind)) {
      throw new NotFoundException(`Справочник «${kind}» не найден`);
    }
    switch (kind as SwReferenceKind) {
      case 'elementTypes':
        return (await this.db.db.select().from(swRefElementTypes).orderBy(asc(swRefElementTypes.sortOrder))).map(
          (r) => ({ code: r.code, name: r.name, sortOrder: r.sortOrder, isActive: r.isActive }),
        );
      case 'responsibilityRoles':
        return (await this.db.db.select().from(swRefResponsibilityRoles).orderBy(asc(swRefResponsibilityRoles.name))).map(
          (r) => ({ code: r.code, name: r.name, isActive: r.isActive }),
        );
      case 'developmentKinds':
        return (await this.db.db.select().from(swRefDevelopmentKinds).orderBy(asc(swRefDevelopmentKinds.code))).map(
          (r) => ({ code: r.code, name: r.name, isActive: r.isActive }),
        );
      case 'documentKinds':
        return (await this.db.db.select().from(swRefDocumentKinds).orderBy(asc(swRefDocumentKinds.sortOrder))).map(
          (r) => ({
            code: r.code,
            gostCode: r.gostCode,
            name: r.name,
            requiresApprovalSheet: r.requiresApprovalSheet,
            sortOrder: r.sortOrder,
            isActive: r.isActive,
          }),
        );
      case 'statuses':
        return (await this.db.db.select().from(swRefStatuses).orderBy(asc(swRefStatuses.sortOrder))).map((r) => ({
          code: r.code,
          name: r.name,
          isFinal: r.isFinal,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        }));
      case 'statusApplicability':
        return (
          await this.db.db
            .select()
            .from(swRefStatusApplicability)
            .orderBy(asc(swRefStatusApplicability.developmentKindCode), asc(swRefStatusApplicability.scope))
        ).map((r) => ({
          statusCode: r.statusCode,
          developmentKindCode: r.developmentKindCode,
          scope: r.scope,
        }));
      default:
        throw new NotFoundException(`Справочник «${kind}» не найден`);
    }
  }

  async applicableStatuses(developmentKindCode: string, scope: 'document' | 'sheet') {
    const rows = await this.db.db
      .select({
        code: swRefStatuses.code,
        name: swRefStatuses.name,
        isFinal: swRefStatuses.isFinal,
        sortOrder: swRefStatuses.sortOrder,
      })
      .from(swRefStatusApplicability)
      .innerJoin(swRefStatuses, eq(swRefStatuses.code, swRefStatusApplicability.statusCode))
      .where(
        and(
          eq(swRefStatusApplicability.developmentKindCode, developmentKindCode),
          eq(swRefStatusApplicability.scope, scope),
          eq(swRefStatuses.isActive, true),
        ),
      )
      .orderBy(asc(swRefStatuses.sortOrder));

    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      requiresIps: r.code === 'in_ips',
      isFinal: r.isFinal,
    }));
  }
}
