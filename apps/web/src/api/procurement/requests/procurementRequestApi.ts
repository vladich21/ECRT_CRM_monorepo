import { apiClient } from '../../clients';
import {
  EMPTY_PURCHASE_REQUEST_TAB_COUNTS,
  type AddPurchaseRequestSupplierPayload,
  type AssignPurchaseRequestLeadPayload,
  type CreatePurchaseQuotePayload,
  type CreatePurchaseRequestPayload,
  type FixPurchasePricePayload,
  type PurchaseQuoteRow,
  type PurchaseRequestComparison,
  type PurchaseRequestDetail,
  type PurchaseRequestJournalEntry,
  type PurchaseRequestListRow,
  type PurchaseRequestsListParams,
  type PurchaseRequestSupplierCandidate,
  type PurchaseRequestSupplierRow,
  type PurchaseRequestTabCounts,
  type ReplaceIncomeContractPayload,
  type SelectionReasonOption,
  type SelectPurchaseSupplierPayload,
  type SendPurchaseRequestToAgreementPayload,
  type SetPurchaseMethodPayload,
  type PurchaseRequestMethods,
  type ChoosePurchaseRoutePayload,
  type UpdatePurchaseQuotePayload,
  type UpdatePurchaseRequestPayload,
  type VatRateOption,
} from './procurementRequest.types';

export type {
  CreatePurchaseRequestPayload,
  FundingSource,
  PurchaseRequestDetail,
  PurchaseRequestListRow,
  PurchaseRequestTabCounts,
  PurchaseRequestJournalAction,
  PurchaseRequestJournalEntry,
  PurchaseRequestJournalPayload,
  PurchaseRequestsListParams,
  PurchaseRequestStatus,
  ReplaceIncomeContractPayload,
  UpdatePurchaseRequestPayload,
  AssignPurchaseRequestLeadPayload,
  SendPurchaseRequestToAgreementPayload,
  AddPurchaseRequestSupplierPayload,
  PartnerProcurementFlags,
  PurchaseRequestSupplierCandidate,
  PurchaseRequestSupplierRow,
  CreatePurchaseQuotePayload,
  UpdatePurchaseQuotePayload,
  PurchaseQuoteRow,
  PurchaseQuotePaymentTerm,
  VatRateOption,
  QuoteSnapshot,
  PurchaseRequestComparison,
  SelectionReasonOption,
  PriceMethod,
  PurchaseRequestMethods,
  SetPurchaseMethodPayload,
  ChoosePurchaseRoutePayload,
} from './procurementRequest.types';
export {
  EMPTY_PURCHASE_REQUEST_TAB_COUNTS,
  FUNDING_SOURCES,
  MONEY_NUMERIC_MAX,
  PURCHASE_REQUEST_AGREEMENT_ENTITY_TYPE,
  PURCHASE_REQUEST_ENTITY_TYPE,
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_QUOTE_ENTITY_TYPE,
  QUOTE_PAYMENT_TYPES,
  QUOTE_DAY_KINDS,
  SHARE_TOTAL_CENTS,
  PRICE_METHODS,
} from './procurementRequest.types';

function compactParams(obj: Record<string, string | number | undefined>) {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== '')) as Record<
    string,
    string | number
  >;
}

export const procurementRequestApi = {
  getList: async (
    params: PurchaseRequestsListParams,
  ): Promise<{
    data: PurchaseRequestListRow[];
    total: number;
    tab_counts: PurchaseRequestTabCounts;
  }> => {
    const { data } = await apiClient.get<{
      data: PurchaseRequestListRow[];
      total: number;
      tab_counts?: PurchaseRequestTabCounts;
    }>('/procurement/requests', {
      params: compactParams({
        status: params.status,
        projectId: params.projectId,
        initiatorId: params.initiatorId,
        search: params.search,
        limit: params.limit,
        offset: params.offset,
      }),
    });
    return {
      data: Array.isArray(data?.data) ? data.data : [],
      total: typeof data?.total === 'number' ? data.total : 0,
      tab_counts: { ...EMPTY_PURCHASE_REQUEST_TAB_COUNTS, ...(data?.tab_counts ?? {}) },
    };
  },

  getById: async (id: string): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.get<PurchaseRequestDetail>(`/procurement/requests/detail/${id}`);
    return data;
  },

  create: async (payload: CreatePurchaseRequestPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>('/procurement/requests', payload);
    return data;
  },

  update: async (id: string, payload: UpdatePurchaseRequestPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.patch<PurchaseRequestDetail>(`/procurement/requests/detail/${id}`, payload);
    return data;
  },

  getJournal: async (id: string): Promise<PurchaseRequestJournalEntry[]> => {
    const { data } = await apiClient.get<{ data: PurchaseRequestJournalEntry[] }>(
      `/procurement/requests/detail/${id}/journal`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  replaceIncomeContract: async (id: string, payload: ReplaceIncomeContractPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.put<PurchaseRequestDetail>(
      `/procurement/requests/detail/${id}/income-contract`,
      payload,
    );
    return data;
  },

  submit: async (id: string): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(`/procurement/requests/detail/${id}/submit`, {});
    return data;
  },

  sendToAgreement: async (
    id: string,
    payload: SendPurchaseRequestToAgreementPayload,
  ): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(
      `/procurement/requests/detail/${id}/to-agreement`,
      payload,
    );
    return data;
  },

  assignLead: async (id: string, payload: AssignPurchaseRequestLeadPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(`/procurement/requests/detail/${id}/lead`, payload);
    return data;
  },

  getSuppliers: async (id: string): Promise<PurchaseRequestSupplierRow[]> => {
    const { data } = await apiClient.get<{ data: PurchaseRequestSupplierRow[] }>(
      `/procurement/requests/detail/${id}/suppliers`,
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  searchSupplierCandidates: async (id: string, search: string): Promise<PurchaseRequestSupplierCandidate[]> => {
    const { data } = await apiClient.get<{ data: PurchaseRequestSupplierCandidate[] }>(
      `/procurement/requests/detail/${id}/supplier-candidates`,
      { params: compactParams({ search }) },
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  addSupplier: async (id: string, payload: AddPurchaseRequestSupplierPayload): Promise<PurchaseRequestSupplierRow> => {
    const { data } = await apiClient.post<PurchaseRequestSupplierRow>(
      `/procurement/requests/detail/${id}/suppliers`,
      payload,
    );
    return data;
  },

  getVatRates: async (): Promise<VatRateOption[]> => {
    const { data } = await apiClient.get<{ data: VatRateOption[] }>('/procurement/requests/catalog/vat-rates');
    return Array.isArray(data?.data) ? data.data : [];
  },

  getQuotes: async (id: string): Promise<PurchaseQuoteRow[]> => {
    const { data } = await apiClient.get<{ data: PurchaseQuoteRow[] }>(`/procurement/requests/detail/${id}/quotes`);
    return Array.isArray(data?.data) ? data.data : [];
  },

  createQuote: async (id: string, payload: CreatePurchaseQuotePayload): Promise<PurchaseQuoteRow> => {
    const { data } = await apiClient.post<PurchaseQuoteRow>(`/procurement/requests/detail/${id}/quotes`, payload);
    return data;
  },

  updateQuote: async (quoteId: string, payload: UpdatePurchaseQuotePayload): Promise<PurchaseQuoteRow> => {
    const { data } = await apiClient.patch<PurchaseQuoteRow>(`/procurement/requests/quotes/${quoteId}`, payload);
    return data;
  },

  getComparison: async (id: string): Promise<PurchaseRequestComparison> => {
    const { data } = await apiClient.get<PurchaseRequestComparison>(`/procurement/requests/detail/${id}/comparison`);
    return data;
  },

  getSelectionReasons: async (): Promise<SelectionReasonOption[]> => {
    const { data } = await apiClient.get<{ data: SelectionReasonOption[] }>(
      '/procurement/requests/catalog/selection-reasons',
    );
    return Array.isArray(data?.data) ? data.data : [];
  },

  fixPrice: async (id: string, payload: FixPurchasePricePayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(`/procurement/requests/detail/${id}/price`, payload);
    return data;
  },

  selectSupplier: async (id: string, payload: SelectPurchaseSupplierPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(
      `/procurement/requests/detail/${id}/supplier`,
      payload,
    );
    return data;
  },

  getMethods: async (id: string): Promise<PurchaseRequestMethods> => {
    const { data } = await apiClient.get<PurchaseRequestMethods>(`/procurement/requests/detail/${id}/methods`);
    return data;
  },

  setMethod: async (id: string, payload: SetPurchaseMethodPayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(`/procurement/requests/detail/${id}/method`, payload);
    return data;
  },

  chooseRoute: async (id: string, payload: ChoosePurchaseRoutePayload): Promise<PurchaseRequestDetail> => {
    const { data } = await apiClient.post<PurchaseRequestDetail>(`/procurement/requests/detail/${id}/route`, payload);
    return data;
  },
};
