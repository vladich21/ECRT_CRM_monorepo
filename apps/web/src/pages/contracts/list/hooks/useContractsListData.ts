import { useMemo } from 'react';

import type { ContractsListParams } from '@/api/contracts/contractApi';
import { useContracts } from '@/api/contracts/contractApiHooks';
import { useContractReferenceData } from '@/api/hooks/useContractReferenceData';
import { EMPTY_DELETION_TAB_COUNTS } from '@/constants/deletionScope';
import type { ContractListReferences } from '../ContractsListPage.types';

function buildSelectOptions(references: ContractListReferences) {
  return {
    partners: (references?.partners ?? []).map(partner => ({
      label: partner.name,
      value: partner.id,
    })),
    categories: (references?.contractCategories ?? []).map(category => ({
      label: category.name,
      value: category.id,
    })),
    states: (references?.contractStates ?? []).map(state => ({
      label: state.name,
      value: state.id,
    })),
  };
}

export function useContractsListData(apiFilters: ContractsListParams, page: number, pageSize: number) {
  const { data, isLoading, isError, isFetching } = useContracts(apiFilters, page, pageSize);
  const deletedCountFilters = useMemo<ContractsListParams>(
    () => ({
      ...apiFilters,
      list_tab: 'all',
      deleted_scope: 'deleted',
    }),
    [apiFilters],
  );
  const { data: deletedCountData } = useContracts(deletedCountFilters, 1, 1);
  const {
    data: referenceBooks,
    isError: isRefsError,
    isLoading: isRefsLoading,
  } = useContractReferenceData();

  const contracts = data?.data ?? [];
  const total = data?.total ?? 0;
  const tabCounts = data?.tab_counts ?? {
    all: 0,
    active: 0,
    draft: 0,
    inactive: 0,
  };
  const deletionTabCounts = data?.deletion_tab_counts ?? EMPTY_DELETION_TAB_COUNTS;
  const deletedTabCount = deletedCountData?.total ?? deletionTabCounts.deleted;
  const references = referenceBooks as ContractListReferences;
  const selectOptions = useMemo(() => buildSelectOptions(references), [references]);
  const isInitialLoad = isRefsLoading || (isLoading && !data);

  return {
    data,
    contracts,
    total,
    tabCounts,
    deletedTabCount,
    references,
    selectOptions,
    isInitialLoad,
    isLoading,
    isError,
    isFetching,
    isRefsLoading,
    isRefsError,
  };
}
