import { useMemo } from 'react';
import { Card, Row, Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';

import { useReferenceData } from '../../../../../api/hooks/useReferences';
import { Loader } from '../../../../../components/loader/Loader';
import { NotFound } from '../../../../../components/notFound/NotFound';
import pageStyles from '../../ContractDetails.module.scss';
import { StageCard } from '../stages/StageCard';
import { ContractMainInfoSummaryCard } from './components/ContractMainInfoSummaryCard';
import { ContractStageFiltersModal } from './components/ContractStageFiltersModal';
import { ContractStageFormModal } from './components/ContractStageFormModal';
import { ContractStagesCardExtra } from './components/ContractStagesCardExtra';
import { ContractStagesToolbar } from './components/ContractStagesToolbar';
import { CONTRACT_MAIN_INFO_REFERENCE_TYPES } from './constants/mainInfoReferenceKeys';
import { buildMainInfoItems } from './contractInfoItems';
import { useContractStageManager } from './hooks/useContractStageManager';
import type { ContractMainInfoOutletContext } from './types/contractMainInfoTab.types';

const { Text } = Typography;

export function ContractMainInfoTab() {
  const { contract, stages: outletStages = [] } = useOutletContext<ContractMainInfoOutletContext>();
  const {
    data: referenceBooks,
    isError: isReferencesError,
    isLoading: isReferencesLoading,
  } = useReferenceData(CONTRACT_MAIN_INFO_REFERENCE_TYPES);

  const {
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
    progressStats,
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
  } = useContractStageManager(outletStages, contract, referenceBooks);

  const infoItems = useMemo(
    () => (contract && referenceBooks ? buildMainInfoItems(contract, referenceBooks) : []),
    [contract, referenceBooks],
  );

  if (isReferencesLoading) return <Loader />;
  if (isReferencesError || !referenceBooks || !contract) {
    return <NotFound errorMessage='Договор не найден' />;
  }

  return (
    <>{stageNotificationContextHolder}
      <ContractMainInfoSummaryCard
        contract={contract}
        infoItems={infoItems}
        isMainInfoExpanded={ui.isExpanded}
        onToggleMainInfoExpanded={() => setUi(prev => ({ ...prev, isExpanded: !prev.isExpanded }))}
        currentStageDisplayIndex={progressStats.currentStageDisplayIndex}
        totalStagesCount={progressStats.totalStagesCountForProgress}
        progressPercent={progressStats.totalProgressPercent}
      />

      <Card
        title='Этапы выполнения'
        className={pageStyles.stagesCard}
        extra={
          <ContractStagesCardExtra
            activeFiltersCount={activeStageFiltersCount}
            onOpenFilters={openStageFiltersModal}
            onAddStage={openAddStageModal}
          />
        }
      >
        <ContractStagesToolbar
          stageSearch={ui.stageSearch}
          onStageSearchChange={value => setUi(prev => ({ ...prev, stageSearch: value }))}
          visibleStagesCount={filteredStages.length}
          totalStagesCount={stagesState.length}
          hasAnyExpandedAmongVisible={hasAnyExpandedAmongVisibleStages}
          onToggleExpandCollapseAll={toggleAllVisibleStagesExpanded}
        />

        {filteredStages.length === 0 && stagesState.length > 0 && (
          <Text type='secondary'>Нет этапов по заданным фильтрам или поиску.</Text>
        )}
        {filteredStages.length === 0 && stagesState.length === 0 && (
          <Text type='secondary'>Этапы не добавлены. Нажмите «Добавить этап», чтобы создать первый.</Text>
        )}
        {filteredStages.length > 0 && (
          <Row gutter={[16, 10]}>
            {filteredStages.map(stage => (
              <StageCard
                key={stage.id}
                stage={stage}
                contractStageStates={referenceBooks.contractStageStates}
                users={referenceBooks.users}
                isExpanded={ui.expandedStageIds[stage.id] !== false}
                onToggle={() => toggleStageExpanded(stage.id)}
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
        onClose={() => setUi(prev => ({ ...prev, isFiltersOpen: false }))}
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
        isLoading={isStageMutating}
      />
    </>
  );
}
