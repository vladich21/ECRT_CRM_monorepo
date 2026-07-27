import { useLayoutEffect, useMemo, useState } from 'react';
import { Form } from 'antd';
import dayjs from 'dayjs';

import { useNotification } from '@/hooks/notifications/useNotification';

import {
  useCreateContractStage,
  useDeleteContractStage,
  useUpdateContractStage,
} from '@/api/contractStages/contractStagesApiHooks';
import type { ReferenceData } from '@/api/hooks/useReferences';
import type { Contract, ContractStage } from '@/types/contract';
import { syncContractStageStateId } from '../../stages/utils/stageHelpers';
import {
  DEFAULT_STAGE_LIST_FILTERS,
  INITIAL_CONTRACT_MAIN_INFO_UI,
  type StageListFilters,
} from '../types/contractMainInfoTab.types';
import { computeMainTabStagesSync } from '../utils/computeMainTabStagesSync';
import { countActiveStageListFilters, filterAndSortStagesForMainTab } from '../utils/filterStagesForMainTab';
import { applyBulkExpandCollapseForStages } from '../utils/stageExpandedIdsBulkToggle';
import { coerceStageFormNumber, formatStageFormDateToIso } from '../utils/stageFormValues';

type StageManagerRefs = {
  contractStageStates?: ReferenceData['contractStageStates'];
  users?: ReferenceData['users'];
};

export function useContractStageManager(
  outletStages: ContractStage[],
  contract: Contract | undefined,
  referenceBooks: StageManagerRefs | undefined,
) {
  const [ui, setUi] = useState(INITIAL_CONTRACT_MAIN_INFO_UI);
  const [stagesState, setStagesState] = useState<ContractStage[]>(outletStages);
  const [stageListFilters, setStageListFilters] = useState<StageListFilters>(DEFAULT_STAGE_LIST_FILTERS);
  const [addStageForm] = Form.useForm();
  const [filtersForm] = Form.useForm();

  const { showNotification, contextHolder: stageNotificationContextHolder } = useNotification();
  const { mutateAsync: createStage, isPending: isCreating } = useCreateContractStage();
  const { mutateAsync: updateStage, isPending: isUpdating } = useUpdateContractStage();
  const { mutateAsync: deleteStage, isPending: isDeleting } = useDeleteContractStage();

  const isStageMutating = isCreating || isUpdating || isDeleting;

  useLayoutEffect(() => {
    const syncResult = computeMainTabStagesSync({ outletStages, referenceBooks });
    setStagesState(syncResult.kind === 'from_api' ? syncResult.stages : []);
  }, [outletStages, referenceBooks]);

  const filteredStages = useMemo(
    () => filterAndSortStagesForMainTab(stagesState, ui.stageSearch, stageListFilters, referenceBooks?.contractStageStates),
    [stagesState, ui.stageSearch, stageListFilters.status, stageListFilters.responsible, stageListFilters.deadline, stageListFilters.budget, referenceBooks?.contractStageStates],
  );

  const activeStageFiltersCount = countActiveStageListFilters(stageListFilters);

  const hasAnyExpandedAmongVisibleStages = useMemo(
    () => filteredStages.some(stage => ui.expandedStageIds[stage.id] !== false),
    [filteredStages, ui.expandedStageIds],
  );

  const completedStagesCount = stagesState.filter(stage => Boolean(stage.actual_end_date)).length;
  const totalProgressPercent = stagesState.length > 0 ? (completedStagesCount / stagesState.length) * 100 : 0;
  const nextStageIndexOneBased = completedStagesCount + 1;
  const currentStageDisplayIndex = Math.min(nextStageIndexOneBased, stagesState.length) || 1;
  const totalStagesCountForProgress = stagesState.length || 1;

  const toggleAllVisibleStagesExpanded = () => {
    if (filteredStages.length === 0) return;
    setUi(prev => ({
      ...prev,
      expandedStageIds: applyBulkExpandCollapseForStages(filteredStages, prev.expandedStageIds),
    }));
  };

  const openStageFiltersModal = () => {
    filtersForm.setFieldsValue(stageListFilters);
    setUi(prev => ({ ...prev, isFiltersOpen: true }));
  };

  const applyStageFilters = async () => {
    const values = await filtersForm.validateFields();
    setStageListFilters({
      status: values.status,
      responsible: values.responsible,
      deadline: values.deadline,
      budget: values.budget,
    });
    setUi(prev => ({ ...prev, isFiltersOpen: false }));
  };

  const resetStageFilters = () => {
    filtersForm.resetFields();
    setStageListFilters(DEFAULT_STAGE_LIST_FILTERS);
    setUi(prev => ({ ...prev, isFiltersOpen: false }));
  };

  const openAddStageModal = () => {
    addStageForm.resetFields();
    addStageForm.setFieldsValue({ responsible_id: undefined });
    setUi(prev => ({ ...prev, isAddStageOpen: true, editingStageId: null }));
  };

  const openEditStageModal = (stage: ContractStage) => {
    const coexecutor = stage.coexecutor_budget ?? 0;
    const own =
      (stage.own_budget ?? 0) > 0 || coexecutor > 0
        ? stage.own_budget ?? 0
        : stage.planned_budget;
    addStageForm.setFieldsValue({
      name: stage.name,
      planned_start_date: stage.planned_start_date ? dayjs(stage.planned_start_date) : null,
      planned_end_date: stage.planned_end_date ? dayjs(stage.planned_end_date) : null,
      actual_start_date: stage.actual_start_date ? dayjs(stage.actual_start_date) : null,
      actual_end_date: stage.actual_end_date ? dayjs(stage.actual_end_date) : null,
      coexecutor_budget: coexecutor > 0 ? coexecutor : undefined,
      own_budget: own > 0 ? own : undefined,
      forecasted_budget: stage.forecasted_budget > 0 ? stage.forecasted_budget : undefined,
      actual_budget: stage.actual_budget > 0 ? stage.actual_budget : undefined,
      responsible_id: stage.responsible_id || undefined,
    });
    setUi(prev => ({ ...prev, isAddStageOpen: true, editingStageId: stage.id }));
  };

  const closeStageModal = () => {
    addStageForm.resetFields();
    setUi(prev => ({ ...prev, isAddStageOpen: false, editingStageId: null }));
  };

  const handleDeleteStage = async (stage: ContractStage) => {
    if (!contract?.id) return;
    try {
      await deleteStage({ contractId: contract.id, stageId: stage.id });
      // UI обновится автоматически через React Query invalidation
    } catch {
      showNotification('error', 'Ошибка удаления', 'Не удалось удалить этап. Попробуйте еще раз.');
    }
  };

  const handleSaveStage = async () => {
    const values = await addStageForm.validateFields();
    if (!contract?.id) return;

    const stageStates = referenceBooks?.contractStageStates ?? [];
    const coexecutorBudget = coerceStageFormNumber(values.coexecutor_budget);
    const ownBudget = coerceStageFormNumber(values.own_budget);
    const plannedBudget = coexecutorBudget + ownBudget;
    const stageData: Partial<ContractStage> = {
      name: values.name,
      responsible_id: values.responsible_id ?? '',
      planned_start_date: formatStageFormDateToIso(values.planned_start_date),
      planned_end_date: formatStageFormDateToIso(values.planned_end_date),
      actual_start_date: formatStageFormDateToIso(values.actual_start_date),
      actual_end_date: formatStageFormDateToIso(values.actual_end_date),
      coexecutor_budget: coexecutorBudget,
      own_budget: ownBudget,
      planned_budget: plannedBudget,
      forecasted_budget: coerceStageFormNumber(values.forecasted_budget ?? plannedBudget),
      actual_budget: coerceStageFormNumber(values.actual_budget),
    };

    try {
      if (ui.editingStageId) {
        const existingStage = stagesState.find(stage => stage.id === ui.editingStageId);
        const updatedForState: ContractStage = {
          ...(existingStage ?? ({} as ContractStage)),
          ...stageData,
        } as ContractStage;
        await updateStage({
          contractId: contract.id,
          stageId: ui.editingStageId,
          data: { ...stageData, state_id: syncContractStageStateId(updatedForState, stageStates) },
        });
      } else {
        const maxNumber = stagesState.reduce((max, row) => Math.max(max, row.stage_number), 0) + 1;
        const newStage: ContractStage = {
          ...(stageData as ContractStage),
          id: '',
          contract_id: contract.id,
          stage_number: maxNumber,
          state_id: '',
          is_archived: false,
          created_at: '',
          updated_at: '',
        };
        newStage.state_id = syncContractStageStateId(newStage, stageStates);
        await createStage({ contractId: contract.id, data: newStage });
      }
      addStageForm.resetFields();
      setUi(prev => ({ ...prev, isAddStageOpen: false, editingStageId: null }));
    } catch {
      showNotification('error', 'Ошибка сохранения', 'Не удалось сохранить этап. Попробуйте еще раз.');
    }
  };

  const toggleStageExpanded = (stageId: string) => {
    setUi(prev => {
      const wasExpanded = prev.expandedStageIds[stageId] !== false;
      return {
        ...prev,
        expandedStageIds: { ...prev.expandedStageIds, [stageId]: !wasExpanded },
      };
    });
  };

  return {
    ui,
    setUi,
    stagesState,
    filteredStages,
    activeStageFiltersCount,
    hasAnyExpandedAmongVisibleStages,
    addStageForm,
    filtersForm,
    isStageMutating,
    stageNotificationContextHolder,
    progressStats: { currentStageDisplayIndex, totalStagesCountForProgress, totalProgressPercent },
    toggleAllVisibleStagesExpanded,
    openStageFiltersModal,
    applyStageFilters,
    resetStageFilters,
    openAddStageModal,
    openEditStageModal,
    closeStageModal,
    handleDeleteStage,
    handleSaveStage,
    toggleStageExpanded,
  };
}
