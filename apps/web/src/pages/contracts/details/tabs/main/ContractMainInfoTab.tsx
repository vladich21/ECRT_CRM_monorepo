import { useOutletContext } from 'react-router-dom';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Alert, Card, Form, Row, Typography } from 'antd';
import dayjs from 'dayjs';
import type { ContractStage } from '../../../../../types/contract';
import { NotFound } from '../../../../../components/notFound/NotFound';
import { Loader } from '../../../../../components/loader/Loader';
import { useReferenceData } from '../../../../../api/hooks/useReferences';
import { buildMainInfoItems } from './contractInfoItems';
import { StageCard } from '../stages/StageCard';
import { syncContractStageStateId } from '../stages/utils/stageHelpers';
import pageStyles from '../../ContractDetails.module.scss';
import { CONTRACT_MAIN_INFO_REFERENCE_TYPES } from './constants/mainInfoReferenceKeys';
import { ContractMainInfoSummaryCard } from './components/ContractMainInfoSummaryCard';
import { ContractStagesCardExtra } from './components/ContractStagesCardExtra';
import { ContractStagesToolbar } from './components/ContractStagesToolbar';
import { ContractStageFiltersModal } from './components/ContractStageFiltersModal';
import { ContractStageFormModal } from './components/ContractStageFormModal';
import { computeMainTabStagesSync } from './utils/computeMainTabStagesSync';
import {
  countActiveStageListFilters,
  filterAndSortStagesForMainTab,
} from './utils/filterStagesForMainTab';
import { applyBulkExpandCollapseForStages } from './utils/stageExpandedIdsBulkToggle';
import { coerceStageFormNumber, formatStageFormDateToIso } from './utils/stageFormValues';
import {
  type ContractMainInfoOutletContext,
  DEFAULT_STAGE_LIST_FILTERS,
  INITIAL_CONTRACT_MAIN_INFO_UI,
  type StageListFilters,
} from './types/contractMainInfoTab.types';

const { Text } = Typography;

export function ContractMainInfoTab() {
  const { contract, stages: outletStages = [] } = useOutletContext<ContractMainInfoOutletContext>();
  const [ui, setUi] = useState(INITIAL_CONTRACT_MAIN_INFO_UI);
  const [stagesState, setStagesState] = useState<ContractStage[]>(outletStages);
  const [stageListFilters, setStageListFilters] = useState<StageListFilters>(DEFAULT_STAGE_LIST_FILTERS);
  const [usingMockStages, setUsingMockStages] = useState(false);
  const [addStageForm] = Form.useForm();
  const [filtersForm] = Form.useForm();

  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(CONTRACT_MAIN_INFO_REFERENCE_TYPES);

  useLayoutEffect(() => {
    const syncResult = computeMainTabStagesSync({
      outletStages,
      contractId: contract?.id,
      referenceBooks,
    });

    if (syncResult.kind === 'empty') {
      setStagesState([]);
      setUsingMockStages(false);
      return;
    }

    if (syncResult.kind === 'from_api') {
      setStagesState(syncResult.stages);
      setUsingMockStages(false);
      return;
    }

    setStagesState(syncResult.stages);
    setUsingMockStages(true);
    setUi((previous) => ({
      ...previous,
      expandedStageIds: syncResult.expandedStageIds,
    }));
  }, [outletStages, contract?.id, referenceBooks]);

  const filteredStages = useMemo(
    () =>
      filterAndSortStagesForMainTab(
        stagesState,
        ui.stageSearch,
        stageListFilters,
        referenceBooks?.contractStageStates,
      ),
    [
      stagesState,
      ui.stageSearch,
      stageListFilters.status,
      stageListFilters.responsible,
      stageListFilters.deadline,
      stageListFilters.budget,
      referenceBooks?.contractStageStates,
    ],
  );

  const activeStageFiltersCount = countActiveStageListFilters(stageListFilters);

  const hasAnyExpandedAmongVisibleStages = useMemo(
    () => filteredStages.some((stage) => ui.expandedStageIds[stage.id] !== false),
    [filteredStages, ui.expandedStageIds],
  );

  const toggleAllVisibleStagesExpanded = () => {
    if (filteredStages.length === 0) return;
    setUi((previous) => ({
      ...previous,
      expandedStageIds: applyBulkExpandCollapseForStages(
        filteredStages,
        previous.expandedStageIds,
      ),
    }));
  };

  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks || !contract) {
    return <NotFound errorMessage="Договор не найден" />;
  }

  const completedStagesCount = stagesState.filter((stage) => Boolean(stage.actual_end_date)).length;
  const totalProgressPercent =
    stagesState.length > 0 ? (completedStagesCount / stagesState.length) * 100 : 0;
  const nextStageIndexOneBased = completedStagesCount + 1;
  const currentStageDisplayIndex = Math.min(nextStageIndexOneBased, stagesState.length) || 1;
  const totalStagesCountForProgress = stagesState.length || 1;

  const infoItems = buildMainInfoItems(contract, referenceBooks);

  const openStageFiltersModal = () => {
    filtersForm.setFieldsValue({
      status: stageListFilters.status,
      responsible: stageListFilters.responsible,
      deadline: stageListFilters.deadline,
      budget: stageListFilters.budget,
    });
    setUi((previous) => ({ ...previous, isFiltersOpen: true }));
  };

  const applyStageFilters = async () => {
    const validatedValues = await filtersForm.validateFields();
    setStageListFilters({
      status: validatedValues.status,
      responsible: validatedValues.responsible,
      deadline: validatedValues.deadline,
      budget: validatedValues.budget,
    });
    setUi((previous) => ({ ...previous, isFiltersOpen: false }));
  };

  const resetStageFilters = () => {
    filtersForm.resetFields();
    setStageListFilters(DEFAULT_STAGE_LIST_FILTERS);
    setUi((previous) => ({ ...previous, isFiltersOpen: false }));
  };

  const openAddStageModal = () => {
    addStageForm.resetFields();
    addStageForm.setFieldsValue({
      responsible_id: undefined,
    });
    setUi((previous) => ({ ...previous, isAddStageOpen: true, editingStageId: null }));
  };

  const openEditStageModal = (stage: ContractStage) => {
    addStageForm.setFieldsValue({
      name: stage.name,
      planned_start_date: stage.planned_start_date ? dayjs(stage.planned_start_date) : null,
      planned_end_date: stage.planned_end_date ? dayjs(stage.planned_end_date) : null,
      actual_start_date: stage.actual_start_date ? dayjs(stage.actual_start_date) : null,
      actual_end_date: stage.actual_end_date ? dayjs(stage.actual_end_date) : null,
      planned_budget: stage.planned_budget > 0 ? stage.planned_budget : undefined,
      forecasted_budget: stage.forecasted_budget > 0 ? stage.forecasted_budget : undefined,
      actual_budget: stage.actual_budget > 0 ? stage.actual_budget : undefined,
      responsible_id: stage.responsible_id || undefined,
    });
    setUi((previous) => ({ ...previous, isAddStageOpen: true, editingStageId: stage.id }));
  };

  const handleDeleteStage = (stage: ContractStage) => {
    setStagesState((previous) => previous.filter((item) => item.id !== stage.id));
    setUi((previous) => {
      const nextExpanded = { ...previous.expandedStageIds };
      delete nextExpanded[stage.id];
      return { ...previous, expandedStageIds: nextExpanded };
    });
  };

  const closeStageModal = () => {
    addStageForm.resetFields();
    setUi((previous) => ({ ...previous, isAddStageOpen: false, editingStageId: null }));
  };

  const handleSaveStage = async () => {
    const values = await addStageForm.validateFields();

    if (ui.editingStageId) {
      const editingId = ui.editingStageId;
      setStagesState((previous) =>
        previous.map((stageRow) => {
          if (stageRow.id !== editingId) return stageRow;
          const updated: ContractStage = {
            ...stageRow,
            name: values.name,
            responsible_id:
              values.responsible_id != null && values.responsible_id !== ''
                ? values.responsible_id
                : '',
            planned_start_date: formatStageFormDateToIso(values.planned_start_date),
            planned_end_date: formatStageFormDateToIso(values.planned_end_date),
            actual_start_date: formatStageFormDateToIso(values.actual_start_date),
            actual_end_date: formatStageFormDateToIso(values.actual_end_date),
            planned_budget: coerceStageFormNumber(values.planned_budget),
            forecasted_budget: coerceStageFormNumber(
              values.forecasted_budget ?? values.planned_budget,
            ),
            actual_budget: coerceStageFormNumber(values.actual_budget),
            updated_at: new Date().toISOString(),
          };
          return {
            ...updated,
            state_id: syncContractStageStateId(updated, referenceBooks.contractStageStates),
          };
        }),
      );
    } else {
      const maxStageNumber =
        (stagesState.reduce((maxNumber, stageRow) => Math.max(maxNumber, stageRow.stage_number), 0) ||
          0) + 1;
      const newLocalId = `local-stage-${Date.now()}`;
      const newStage: ContractStage = {
        id: newLocalId,
        name: values.name,
        stage_number: maxStageNumber,
        responsible_id:
          values.responsible_id != null && values.responsible_id !== '' ? values.responsible_id : '',
        contract_id: contract.id,
        planned_start_date: formatStageFormDateToIso(values.planned_start_date),
        planned_end_date: formatStageFormDateToIso(values.planned_end_date),
        actual_start_date: formatStageFormDateToIso(values.actual_start_date),
        actual_end_date: formatStageFormDateToIso(values.actual_end_date),
        planned_budget: coerceStageFormNumber(values.planned_budget),
        forecasted_budget: coerceStageFormNumber(values.forecasted_budget ?? values.planned_budget),
        actual_budget: coerceStageFormNumber(values.actual_budget),
        state_id: '',
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newStage.state_id = syncContractStageStateId(newStage, referenceBooks.contractStageStates);
      setStagesState((previous) => [...previous, newStage]);
    }

    addStageForm.resetFields();
    setUi((previous) => ({ ...previous, isAddStageOpen: false, editingStageId: null }));
  };

  return (
    <>
      <ContractMainInfoSummaryCard
        contract={contract}
        infoItems={infoItems}
        isMainInfoExpanded={ui.isExpanded}
        onToggleMainInfoExpanded={() =>
          setUi((previous) => ({ ...previous, isExpanded: !previous.isExpanded }))
        }
        currentStageDisplayIndex={currentStageDisplayIndex}
        totalStagesCount={totalStagesCountForProgress}
        progressPercent={totalProgressPercent}
      />

      <Card
        title="Этапы выполнения"
        className={pageStyles.stagesCard}
        extra={
          <ContractStagesCardExtra
            activeFiltersCount={activeStageFiltersCount}
            onOpenFilters={openStageFiltersModal}
            usingMockStages={usingMockStages}
            onAddStage={openAddStageModal}
          />
        }
      >
        <ContractStagesToolbar
          stageSearch={ui.stageSearch}
          onStageSearchChange={(value) =>
            setUi((previous) => ({ ...previous, stageSearch: value }))
          }
          visibleStagesCount={filteredStages.length}
          totalStagesCount={stagesState.length}
          hasAnyExpandedAmongVisible={hasAnyExpandedAmongVisibleStages}
          onToggleExpandCollapseAll={toggleAllVisibleStagesExpanded}
        />

        {usingMockStages && (
          <Alert
            message="Демонстрационные этапы"
            description="Показаны примеры для превью интерфейса."
            type="info"
            showIcon
            style={{ marginBottom: 12 }}
          />
        )}

        {filteredStages.length === 0 && stagesState.length > 0 && (
          <Text type="secondary">Нет этапов по заданным фильтрам или поиску.</Text>
        )}
        {filteredStages.length === 0 && stagesState.length === 0 && (
          <Text type="secondary">Этапы не загружены.</Text>
        )}
        {filteredStages.length > 0 && (
          <Row gutter={[16, 10]}>
            {filteredStages.map((stage) => (
              <StageCard
                key={stage.id}
                stage={stage}
                contractStageStates={referenceBooks.contractStageStates}
                users={referenceBooks.users}
                isExpanded={ui.expandedStageIds[stage.id] !== false}
                onToggle={() =>
                  setUi((previous) => {
                    const wasExpanded = previous.expandedStageIds[stage.id] !== false;
                    return {
                      ...previous,
                      expandedStageIds: {
                        ...previous.expandedStageIds,
                        [stage.id]: !wasExpanded,
                      },
                    };
                  })
                }
                onEdit={openEditStageModal}
                onDelete={handleDeleteStage}
              />
            ))}
          </Row>
        )}
      </Card>

      <ContractStageFiltersModal
        open={ui.isFiltersOpen}
        form={filtersForm}
        users={referenceBooks.users}
        onClose={() => setUi((previous) => ({ ...previous, isFiltersOpen: false }))}
        onApply={applyStageFilters}
        onReset={resetStageFilters}
      />

      <ContractStageFormModal
        open={ui.isAddStageOpen}
        isEditing={Boolean(ui.editingStageId)}
        form={addStageForm}
        users={referenceBooks.users}
        onCancel={closeStageModal}
        onSubmit={handleSaveStage}
      />
    </>
  );
}
