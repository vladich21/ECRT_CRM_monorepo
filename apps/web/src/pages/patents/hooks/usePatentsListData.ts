import { usePatentReferenceData } from '@/api/hooks/usePatentReferenceData';
import { usePatentsLinkedContractIds, usePatentsList } from '@/api/patents/patentApiHooks';
import type { PatentsDeletedScope } from '@/api/patents/patentApiHooks';
import type { PatentsListServerFilters } from '@/api/patents/patentListFilters.types';

import type { ReferenceDataForPatents } from '../types/data';
import type { PatentAdvancedFilters, PatentListFiltersSelectOptions } from '../types/PatentsListPage.types';
import { usePatentsListContractIdsForFilter } from './usePatentsListContractIdsForFilter';
import { usePatentsListSelectOptions } from './usePatentsListSelectOptions';

type UsePatentsListDataArgs = {
  deletedScope: PatentsDeletedScope;
  page: number;
  pageSize: number;
  serverFilters: PatentsListServerFilters;
  appliedFilters: PatentAdvancedFilters;
  draftFilters: PatentAdvancedFilters;
};

export function usePatentsListData({
  deletedScope,
  page,
  pageSize,
  serverFilters,
  appliedFilters,
  draftFilters,
}: UsePatentsListDataArgs) {
  const {
    data: listData,
    isLoading,
    isError,
    isFetching,
  } = usePatentsList(deletedScope, page, pageSize, serverFilters);

  const { data: patentLinkedContractIds = [] } = usePatentsLinkedContractIds(deletedScope);

  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = usePatentReferenceData({ contractsIncludeInactive: true });

  const refs = referenceBooks as ReferenceDataForPatents;
  const patents = listData?.data ?? [];
  const total = listData?.total ?? 0;
  const tabCounts = listData?.tab_counts ?? { all: 0, deleted: 0 };

  const contractIdsForPatentFilter = usePatentsListContractIdsForFilter(
    patentLinkedContractIds,
    appliedFilters.contractId,
    draftFilters.contractId,
  );

  const selectOptions: PatentListFiltersSelectOptions = usePatentsListSelectOptions(
    refs,
    contractIdsForPatentFilter,
  );

  const isInitialLoad = isRefsLoading || (isLoading && !listData);

  return {
    listData,
    patents,
    total,
    tabCounts,
    refs,
    selectOptions,
    isInitialLoad,
    isLoading,
    isError,
    isFetching,
    isRefsLoading,
    isRefsError,
  };
}
