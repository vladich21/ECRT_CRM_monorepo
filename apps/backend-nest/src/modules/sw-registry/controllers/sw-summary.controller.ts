import { Controller, Get, NotImplementedException, Param, Query } from '@nestjs/common';

import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS } from '../../../shared/permissions';
import { SwReferencesService } from '../services/sw-references.service';
import { SwSummaryService } from '../services/sw-summary.service';

@Controller('sw')
export class SwSummaryController {
  constructor(
    private readonly summary: SwSummaryService,
    private readonly refs: SwReferencesService,
  ) {}

  @Get('summary')
  @RequirePermission(SECTIONS.SW_SUMMARY, 'read')
  getSummary(
    @Query('by') by?: string,
    @Query('elementId') elementId?: string,
    @Query('developmentKind') developmentKind?: string,
    @Query('partnerId') partnerId?: string,
  ) {
    return this.summary.getSummary({ by, elementId, developmentKind, partnerId });
  }

  @Get('summary/exports/excel')
  @RequirePermission(SECTIONS.SW_SUMMARY, 'read')
  exportSummary() {
    throw new NotImplementedException('Выгрузка свода в Excel — следующий срез');
  }

  // 4 сегмента после /api — иначе FilesController (:entityType/:entityId/:filename) перехватит запрос.
  @Get('references/kind/:kind')
  @RequirePermission(SECTIONS.SW_REFERENCES, 'read')
  getReference(@Param('kind') kind: string) {
    return this.refs.list(kind);
  }
}
