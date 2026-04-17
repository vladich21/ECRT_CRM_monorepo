import { useQueries } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useReferenceData } from '../../../api/hooks/useReferences';
import { partnerApi, type PartnerListParams } from '../../../api/partners/partnerApi';
import { partnerQueryKeys } from '../../../api/partners/partnerQueryKeys';
import { usePartners } from '../../../api/partners/partnerApiHooks';
import { fetchPartnerSupplierEvalKpi, supplierEvaluationApi } from '../../../api/supplierEvaluations/supplierEvaluationApi';
import {
  getPartnerInitialEvalQueryKey,
  getPartnerSupplierEvalKpiQueryKey,
} from '../../../api/supplierEvaluations/supplierEvaluationQueryKeys';
import { EMPTY_DELETION_TAB_COUNTS } from '../../../constants/deletionScope';
import type { PartnerFilters } from '../PartnerFiltersModal';
import { PARTNER_FILTER_TABS, type PartnerListTab } from '../PartnersListPage.types';
import { buildPartnersApiFilters, partnerFiltersToTabCountKey } from '../utils/buildPartnersApiFilters';

export function usePartnersListData(
  apiFilters: PartnerListParams,
  page: number,
  pageSize: number,
  debouncedSearch: string,
  appliedFilters: PartnerFilters,
) {
  const { data: partnersData, isLoading, isError, isFetching } = usePartners(apiFilters, page, pageSize);

  const tabCountQueries = useQueries({
    queries: PARTNER_FILTER_TABS.map(({ key }) => ({
      queryKey: partnerQueryKeys.tabCount(key, debouncedSearch.trim(), partnerFiltersToTabCountKey(appliedFilters)),
      queryFn: async () => {
        const filters = buildPartnersApiFilters(debouncedSearch, key, appliedFilters);
        const response = await partnerApi.getPartners(filters, 1, 0);
        return response.total;
      },
      staleTime: 15 * 1000,
    })),
  });

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

  const tabCounts = useMemo(
    () =>
      partnersData?.tab_counts ?? {
        all: 0,
        ready: 0,
        in_progress: 0,
        key_supplier: 0,
      },
    [partnersData?.tab_counts],
  );

  const deletionTabCounts = partnersData?.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS;

  const getTabCount = useCallback(
    (tabKey: PartnerListTab) => {
      const tabIndex = PARTNER_FILTER_TABS.findIndex(tab => tab.key === tabKey);
      const queriedTotal = tabIndex >= 0 ? tabCountQueries[tabIndex]?.data : undefined;
      if (typeof queriedTotal === 'number') return queriedTotal;
      return tabKey === 'deleted' ? deletionTabCounts.deleted : tabCounts[tabKey];
    },
    [tabCountQueries, deletionTabCounts.deleted, tabCounts],
  );

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
    getTabCount,
    filterOptions,
  };
}
