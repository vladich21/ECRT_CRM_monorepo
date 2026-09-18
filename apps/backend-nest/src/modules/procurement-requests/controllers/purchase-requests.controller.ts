import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';

import { RequirePermission } from '../../permissions/decorators/permission-meta';
import { SECTIONS, type SectionPermission } from '../../../shared/permissions';
import type { RequestWithUser } from '../../auth/types';
import {
  AssignPurchaseRequestLeadEnvelopeDto,
  AddPurchaseRequestSupplierEnvelopeDto,
  CreatePurchaseRequestEnvelopeDto,
  ReplaceIncomeContractEnvelopeDto,
  SubmitPurchaseRequestEnvelopeDto,
  UpdatePurchaseRequestEnvelopeDto,
} from '../dto/purchase-request.dto';
import {
  CreatePurchaseQuoteEnvelopeDto,
  UpdatePurchaseQuoteEnvelopeDto,
} from '../dto/purchase-quote.dto';
import {
  FixPurchasePriceEnvelopeDto,
  SelectPurchaseSupplierEnvelopeDto,
} from '../dto/purchase-nmcd.dto';
import { SendPurchaseRequestToAgreementEnvelopeDto } from '../dto/purchase-agreement.dto';
import { SetPurchaseMethodEnvelopeDto } from '../dto/purchase-method.dto';
import { ChoosePurchaseRouteEnvelopeDto } from '../dto/purchase-route.dto';
import { PurchaseAgreementService } from '../services/purchase-agreement.service';
import { PurchaseChainService } from '../services/purchase-chain.service';
import { PurchaseMethodService } from '../services/purchase-method.service';
import { PurchaseNmcdService } from '../services/purchase-nmcd.service';
import { PurchaseQuotesService } from '../services/purchase-quotes.service';
import { parseStatusFilter, PurchaseRequestsService } from '../services/purchase-requests.service';
import { PurchaseRouteService } from '../services/purchase-route.service';

@Controller('procurement/requests')
export class PurchaseRequestsController {
  constructor(
    private readonly service: PurchaseRequestsService,
    private readonly quotes: PurchaseQuotesService,
    private readonly nmcd: PurchaseNmcdService,
    private readonly agreement: PurchaseAgreementService,
    private readonly methods: PurchaseMethodService,
    private readonly routes: PurchaseRouteService,
    private readonly chain: PurchaseChainService,
  ) {}

  @Get()
  @RequirePermission(SECTIONS.PROCUREMENT_REQUESTS, 'read')
  list(
    @Query('status') status?: string,
    @Query('projectId') projectId?: string,
    @Query('initiatorId') initiatorId?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.service.list(
      {
        status: parseStatusFilter(status),
        projectId: projectId || undefined,
        initiatorId: initiatorId || undefined,
        search: search || undefined,
      },
      limit,
      offset,
    );
  }

  /**
   * 4 сегмента: GET /api/X/Y/Z ловит FilesController.
   * Как Реестр ПО — `detail/:id`, не `/:id`. Справочник тоже 4 сегмента.
   */
  @Get('catalog/vat-rates')
  listVatRates() {
    return this.quotes.listVatRates();
  }

  @Get('catalog/selection-reasons')
  listSelectionReasons() {
    return this.nmcd.listSelectionReasons();
  }

  @Get('detail/:id/comparison')
  getComparison(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.nmcd.getComparison(id, req.user!.user_id, permissions);
  }

  /** ЗАП-22: пишет назначенный ведущий. Policy в сервисе, не секция. */
  @Post('detail/:id/price')
  fixPrice(
    @Param('id') id: string,
    @Body() envelope: FixPurchasePriceEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.nmcd.fixPrice(id, envelope.body, req.user!.user_id);
  }

  /** Выбор поставщика: quote + ?1 причина. Без Guard секции (урок Абрамова). */
  @Post('detail/:id/supplier')
  selectSupplier(
    @Param('id') id: string,
    @Body() envelope: SelectPurchaseSupplierEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.nmcd.selectSupplier(id, envelope.body, req.user!.user_id);
  }

  @Get('detail/:id/quotes')
  listQuotes(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.quotes.list(id, req.user!.user_id, permissions);
  }

  /** ЗАП-21: пишет назначенный ведущий. Policy в сервисе, не секция (урок Абрамова). */
  @Post('detail/:id/quotes')
  createQuote(
    @Param('id') id: string,
    @Body() envelope: CreatePurchaseQuoteEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.quotes.create(id, envelope.body, req.user!.user_id);
  }

  @Patch('quotes/:quoteId')
  updateQuote(
    @Param('quoteId') quoteId: string,
    @Body() envelope: UpdatePurchaseQuoteEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.quotes.update(quoteId, envelope.body, req.user!.user_id);
  }

  @Get('detail/:id/journal')
  journal(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.service.listJournal(id, req.user!.user_id, permissions);
  }

  @Get('detail/:id/supplier-candidates')
  searchSupplierCandidates(
    @Param('id') id: string,
    @Query('search') search: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.service.searchSupplierCandidates(id, search, req.user!.user_id, permissions);
  }

  @Get('detail/:id/suppliers')
  listSuppliers(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.service.listSuppliers(id, req.user!.user_id, permissions);
  }

  /** ЗАП-9: пишет назначенный ведущий. Как ВИ-3 — policy в сервисе, не секция. */
  @Post('detail/:id/suppliers')
  addSupplier(
    @Param('id') id: string,
    @Body() envelope: AddPurchaseRequestSupplierEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.addSupplier(id, envelope.body, req.user!.user_id);
  }

  @Get('detail/:id')
  getOne(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.service.getByIdForUser(id, req.user!.user_id, permissions);
  }

  @Post()
  @RequirePermission(SECTIONS.PROCUREMENT_REQUESTS, 'edit')
  create(@Body() envelope: CreatePurchaseRequestEnvelopeDto, @Req() req: RequestWithUser) {
    return this.service.create(envelope.body, req.user!.user_id);
  }

  @Patch('detail/:id')
  @RequirePermission(SECTIONS.PROCUREMENT_REQUESTS, 'edit')
  update(
    @Param('id') id: string,
    @Body() envelope: UpdatePurchaseRequestEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.update(id, envelope.body, req.user!.user_id);
  }

  /** Ш-2: удалить можно только черновик, и только инициатор — policy в сервисе. */
  @Delete('detail/:id')
  @HttpCode(204)
  @RequirePermission(SECTIONS.PROCUREMENT_REQUESTS, 'edit')
  delete(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.delete(id, req.user!.user_id);
  }

  /** ВИ-3/ВИ-4: инициатор, ведущий или текущий утверждающий. Policy в сервисе. */
  @Put('detail/:id/income-contract')
  replaceIncomeContract(
    @Param('id') id: string,
    @Body() envelope: ReplaceIncomeContractEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.replaceIncomeContract(id, envelope.body, req.user!.user_id);
  }

  @Post('detail/:id/lead')
  @RequirePermission(SECTIONS.PROCUREMENT_LEAD, 'edit')
  assignLead(
    @Param('id') id: string,
    @Body() envelope: AssignPurchaseRequestLeadEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.service.assignLead(id, envelope.body, req.user!.user_id);
  }

  @Post('detail/:id/submit')
  @RequirePermission(SECTIONS.PROCUREMENT_REQUESTS, 'edit')
  submit(
    @Param('id') id: string,
    @Body() envelope: SubmitPurchaseRequestEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.service.submit(id, envelope.body, req.user!.user_id, permissions);
  }

  /** S11: ведущий ОУП. Policy в сервисе, не секция (урок Абрамова). 428 — БП-35. */
  @Post('detail/:id/to-agreement')
  sendToAgreement(
    @Param('id') id: string,
    @Body() envelope: SendPurchaseRequestToAgreementEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.agreement.sendToAgreement(id, envelope.body, req.user!.user_id, permissions);
  }

  /** ВИ-6: только после agreed. 409 если ещё в проработке/согласовании. */
  @Get('detail/:id/methods')
  listMethods(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.methods.listMethods(id, req.user!.user_id, permissions);
  }

  /** Способ закупки пишет назначенный ведущий. Policy в сервисе, не секция. */
  @Post('detail/:id/method')
  setMethod(
    @Param('id') id: string,
    @Body() envelope: SetPurchaseMethodEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.methods.setMethod(id, envelope.body, req.user!.user_id);
  }

  /** ВИ-7: оформить договор. Тендер/счёт и ДС/заказ — явный 422, не noop. */
  @Post('detail/:id/route')
  chooseRoute(
    @Param('id') id: string,
    @Body() envelope: ChoosePurchaseRouteEnvelopeDto,
    @Req() req: RequestWithUser,
  ) {
    return this.routes.chooseRoute(id, envelope.body, req.user!.user_id);
  }

  /** ЗАП-7: дерево происхождения одним запросом, без таблицы-кэша. */
  @Get('detail/:id/chain')
  getChain(@Param('id') id: string, @Req() req: RequestWithUser) {
    const permissions = (req.user as { sectionPermissions?: SectionPermission[] } | undefined)?.sectionPermissions;
    return this.chain.getChain(id, req.user!.user_id, permissions);
  }
}
