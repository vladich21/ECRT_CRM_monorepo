import { useQueries } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { usePartners } from '../../../api/partners/partnerApiHooks';
import { fetchPartnerSupplierEvalKpi, supplierEvaluationApi } from '../../../api/supplierEvaluations/supplierEvaluationApi';
import {
  getPartnerInitialEvalQueryKey,
  getPartnerSupplierEvalKpiQueryKey,
} from '../../../api/supplierEvaluations/supplierEvaluationQueryKeys';
import type { PartnerListParams } from '../../../api/partners/partnerApi';

export function usePartnersListData(
  apiFilters: PartnerListParams,
  page: number,
  pageSize: number,
) {
  const { data: partnersData, isLoading, isError, isFetching } = usePartners(apiFilters, page, pageSize);

  const {
    data: references,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useReferenceData(['partnerTypes', 'partnerStatuses', 'competencies', 'partnerCategories']);

  const partners = partnersData?.data ?? [];
  const total = partnersData?.total ?? 0;
  const isInitialLoad = isRefsLoading || (isLoading && !partnersData);

  const partnerEvalKpiQueries = useQueries({
    queries: partners.map(partner => ({
      queryKey: getPartnerSupplierEvalKpiQueryKey(partner.id),
      queryFn: () => fetchPartnerSupplierEvalKpi(partner.id),
      staleTime: 60 * 1000,
      enabled: !isInitialLoad && partners.length > 0,
    })),
  });

  const partnerInitialEvalQueries = useQueries({
    queries: partners.map(partner => ({
      queryKey: getPartnerInitialEvalQueryKey(partner.id),
      queryFn: () => supplierEvaluationApi.getActiveInitial(partner.id),
      staleTime: 60 * 1000,
      enabled: !isInitialLoad && partners.length > 0,
    })),
  });

  const filterOptions = useMemo(
    () => ({
      types: (references?.partnerTypes ?? []).map(type => ({ label: type.name, value: String(type.id) })),
      statuses: (references?.partnerStatuses ?? []).map(status => ({
        label: status.name,
        value: String(status.id),
      })),
      competencies: (references?.competencies ?? []).map(competence => ({
        label: competence.name,
        value: String(competence.id),
      })),
      partnerCategories: (references?.partnerCategories ?? []).map(category => ({
        label: category.name,
        value: String(category.id),
      })),
    }),
    [references],
  );

  return {
    partners,
    total,
    references,
    isInitialLoad,
    isLoading,
    isError,
    isFetching,
    isRefsLoading,
    isRefsError,
    partnerEvalKpiQueries,
    partnerInitialEvalQueries,
    filterOptions,
  };
}
