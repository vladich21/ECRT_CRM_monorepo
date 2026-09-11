import { Col, Form, Select, Typography } from 'antd';

import { useContractStages } from '@/api/contractStages/contractStagesApiHooks';
import type { Contract } from '@/types/contract';

import { toIncomeContractSelectOptions, toIncomeStageSelectOptions } from './incomeContracts';

const { Text } = Typography;

type Props = {
  contracts: Contract[];
  contractsLoading?: boolean;
  disabled?: boolean;
  contractRequired?: boolean;
  wrapInColumns?: boolean;
  onContractChange?: (contractId: string | undefined, contract?: Contract) => void;
};

export function IncomeContractStageFields({
  contracts,
  contractsLoading,
  disabled,
  contractRequired,
  wrapInColumns,
  onContractChange,
}: Props) {
  const form = Form.useFormInstance();
  const incomeContractId = Form.useWatch('income_contract_id', form) as string | undefined;
  const selectedStageId = Form.useWatch('income_stage_id', form) as string | undefined;
  const { data: stages = [], isFetching: stagesLoading } = useContractStages(incomeContractId ?? '');
  const liveStages = stages.filter(stage => !stage.is_archived);
  const contractPlaceholder = contractRequired ? 'Сначала договор' : 'Необязательно на черновике';
  const stagePlaceholder = !incomeContractId
    ? 'Сначала выберите договор'
    : liveStages.length === 0
      ? 'У договора нет этапов'
      : contractRequired
        ? 'Необязательно'
        : 'Необязательно на черновике';

  const contractItem = (
    <Form.Item
      label='Доходный договор'
      name='income_contract_id'
      rules={contractRequired ? [{ required: true, message: 'Выберите договор' }] : undefined}
    >
      <Select
        allowClear={!contractRequired}
        showSearch
        optionFilterProp='label'
        loading={contractsLoading}
        options={toIncomeContractSelectOptions(contracts)}
        placeholder={contractPlaceholder}
        disabled={disabled}
        onChange={(value: string | undefined) => {
          form.setFieldValue('income_stage_id', undefined);
          onContractChange?.(value, contracts.find(row => row.id === value));
        }}
      />
    </Form.Item>
  );

  const stageItem = (
    <Form.Item label='Этап' name='income_stage_id'>
      <Select
        allowClear
        showSearch
        optionFilterProp='label'
        loading={stagesLoading}
        disabled={disabled || !incomeContractId}
        options={toIncomeStageSelectOptions(stages, selectedStageId)}
        placeholder={stagePlaceholder}
      />
    </Form.Item>
  );

  const emptyHint =
    incomeContractId && liveStages.length === 0 && !stagesLoading ? (
      <Text type='secondary'>У договора нет этапов — можно сохранить без этапа.</Text>
    ) : null;

  if (!wrapInColumns) {
    return (
      <>
        {contractItem}
        {stageItem}
        {emptyHint}
      </>
    );
  }

  return (
    <>
      <Col xs={24} md={12}>
        {contractItem}
      </Col>
      <Col xs={24} md={12}>
        {stageItem}
      </Col>
      {emptyHint ? <Col span={24}>{emptyHint}</Col> : null}
    </>
  );
}
