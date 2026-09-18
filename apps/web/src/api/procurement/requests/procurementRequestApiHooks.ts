import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { invalidateApprovalQueries } from '@/api/approvals/approvalQueryKeys';

import type {
  AddPurchaseRequestSupplierPayload,
  AssignPurchaseRequestLeadPayload,
  CreatePurchaseQuotePayload,
  CreatePurchaseRequestPayload,
  FixPurchasePricePayload,
  PurchaseQuoteRow,
  PurchaseRequestDetail,
  PurchaseRequestsListParams,
  ReplaceIncomeContractPayload,
  SelectPurchaseSupplierPayload,
  SendPurchaseRequestToAgreementPayload,
  SetPurchaseMethodPayload,
  UpdatePurchaseQuotePayload,
  UpdatePurchaseRequestPayload,
  ChoosePurchaseRoutePayload,
} from './procurementRequest.types';
import { procurementRequestApi } from './procurementRequestApi';
import { invalidateProcurementRequestQueries, procurementRequestQueryKeys } from './procurementRequestQueryKeys';

export { procurementRequestQueryKeys } from './procurementRequestQueryKeys';

export function usePurchaseRequestsList(params: PurchaseRequestsListParams, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.list(params),
    queryFn: () => procurementRequestApi.getList(params),
    enabled,
    placeholderData: previousData => previousData,
  });
}

export function usePurchaseRequestDetail(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.one(id ?? ''),
    queryFn: () => procurementRequestApi.getById(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function usePurchaseRequestJournal(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.journal(id ?? ''),
    queryFn: () => procurementRequestApi.getJournal(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function usePurchaseRequestChain(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.chain(id ?? ''),
    queryFn: () => procurementRequestApi.getChain(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useCreatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePurchaseRequestPayload) => procurementRequestApi.create(payload),
    onSuccess: () => {
      void invalidateProcurementRequestQueries(queryClient);
    },
  });
}

export function useUpdatePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdatePurchaseRequestPayload }) =>
      procurementRequestApi.update(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useDeletePurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => procurementRequestApi.delete(id),
    onSuccess: () => {
      void invalidateProcurementRequestQueries(queryClient);
    },
  });
}

export function useReplacePurchaseRequestIncomeContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReplaceIncomeContractPayload }) =>
      procurementRequestApi.replaceIncomeContract(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      void invalidateApprovalQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useSubmitPurchaseRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, includedStepOrders }: { id: string; includedStepOrders?: number[] }) =>
      procurementRequestApi.submit(id, includedStepOrders),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      void invalidateApprovalQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useSendPurchaseRequestToAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SendPurchaseRequestToAgreementPayload }) =>
      procurementRequestApi.sendToAgreement(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      void invalidateApprovalQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useAssignPurchaseRequestLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignPurchaseRequestLeadPayload }) =>
      procurementRequestApi.assignLead(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      void invalidateApprovalQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function usePurchaseRequestSuppliers(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.suppliers(id ?? ''),
    queryFn: () => procurementRequestApi.getSuppliers(id!),
    enabled: Boolean(id) && enabled,
    // current_flags живут в реестре контрагентов и меняются вне этого модуля,
    // поэтому глобальные 30 минут staleTime тут показывали бы устаревший балл.
    staleTime: 0,
  });
}

export function usePurchaseRequestSupplierCandidates(id: string | undefined, search: string, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.supplierCandidates(id ?? '', search),
    queryFn: () => procurementRequestApi.searchSupplierCandidates(id!, search),
    enabled: Boolean(id) && enabled && search.trim().length >= 2,
  });
}

export function useAddPurchaseRequestSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AddPurchaseRequestSupplierPayload }) =>
      procurementRequestApi.addSupplier(id, payload),
    onSuccess: () => {
      void invalidateProcurementRequestQueries(queryClient);
    },
  });
}

export function usePurchaseRequestVatRates(enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.vatRates(),
    queryFn: () => procurementRequestApi.getVatRates(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePurchaseRequestQuotes(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.quotes(id ?? ''),
    queryFn: () => procurementRequestApi.getQuotes(id!),
    enabled: Boolean(id) && enabled,
  });
}

function stampRequestUpdatedAt(queryClient: QueryClient, quote: PurchaseQuoteRow) {
  if (!quote.request_updated_at) return;
  queryClient.setQueryData<PurchaseRequestDetail>(procurementRequestQueryKeys.one(quote.request_id), current =>
    current ? { ...current, updated_at: quote.request_updated_at! } : current,
  );
}

export function useCreatePurchaseQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePurchaseQuotePayload }) =>
      procurementRequestApi.createQuote(id, payload),
    onSuccess: quote => {
      stampRequestUpdatedAt(queryClient, quote);
      void invalidateProcurementRequestQueries(queryClient);
    },
  });
}

export function useUpdatePurchaseQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, payload }: { quoteId: string; payload: UpdatePurchaseQuotePayload }) =>
      procurementRequestApi.updateQuote(quoteId, payload),
    onSuccess: quote => {
      stampRequestUpdatedAt(queryClient, quote);
      void invalidateProcurementRequestQueries(queryClient);
    },
  });
}

export function usePurchaseRequestComparison(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.comparison(id ?? ''),
    queryFn: () => procurementRequestApi.getComparison(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function usePurchaseRequestSelectionReasons(enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.selectionReasons(),
    queryFn: () => procurementRequestApi.getSelectionReasons(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFixPurchaseRequestPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FixPurchasePricePayload }) =>
      procurementRequestApi.fixPrice(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useSelectPurchaseRequestSupplier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SelectPurchaseSupplierPayload }) =>
      procurementRequestApi.selectSupplier(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function usePurchaseRequestMethods(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: procurementRequestQueryKeys.methods(id ?? ''),
    queryFn: () => procurementRequestApi.getMethods(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useSetPurchaseRequestMethod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SetPurchaseMethodPayload }) =>
      procurementRequestApi.setMethod(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}

export function useChoosePurchaseRequestRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChoosePurchaseRoutePayload }) =>
      procurementRequestApi.chooseRoute(id, payload),
    onSuccess: (detail, { id }) => {
      void invalidateProcurementRequestQueries(queryClient);
      queryClient.setQueryData(procurementRequestQueryKeys.one(id), detail);
    },
  });
}
