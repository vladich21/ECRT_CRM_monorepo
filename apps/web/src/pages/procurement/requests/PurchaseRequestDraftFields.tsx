import { CalendarOutlined, ProjectOutlined, ShoppingOutlined } from '@ant-design/icons';
import { Checkbox, Col, DatePicker, Divider, Form, Input, InputNumber, Row, Select } from 'antd';
import type { Dayjs } from 'dayjs';

import {
  FUNDING_SOURCES,
  MONEY_NUMERIC_MAX,
  type FundingSource,
} from '@/api/procurement/requests/procurementRequestApi';
import { EmployeeSelect } from '@/components/approvals/EmployeeSelect';
import { MONEY_INPUT_NUMBER_PROPS } from '@/helpers/numberFormatters';
import type { Contract } from '@/types/contract';

import { IncomeContractStageFields } from './IncomeContractStageFields';
import styles from './PurchaseRequestDraftFields.module.scss';
import { FUNDING_SOURCE_LABELS } from './purchaseRequestLabels';

const { TextArea } = Input;

export type PurchaseRequestDraftFormValues = {
  subject: string;
  justification: string;
  required_date: Dayjs | null;
  project_id: string;
  department_id: string;
  tech_acceptor_id: string;
  funding_source?: FundingSource | null;
  is_urgent: boolean;
  amount?: number | null;
  income_contract_id?: string | null;
  income_stage_id?: string | null;
};

type ProjectOption = { id: string; name: string; code?: string | number };
type DepartmentOption = { id: string; name: string };

type Props = {
  disabled?: boolean;
  writable?: ReadonlySet<string>;
  projects: ProjectOption[];
  departments: DepartmentOption[];
  incomeContracts: Contract[];
  projectsLoading?: boolean;
  departmentsLoading?: boolean;
  contractsLoading?: boolean;
  departmentPrefillHint?: boolean;
};

function isFieldDisabled(writable: ReadonlySet<string> | undefined, name: string, disabled?: boolean): boolean {
  if (disabled) return true;
  if (!writable) return false;
  return !writable.has(name);
}

export function PurchaseRequestDraftFields({
  disabled,
  writable,
  projects,
  departments,
  incomeContracts,
  projectsLoading,
  departmentsLoading,
  contractsLoading,
  departmentPrefillHint,
}: Props) {
  const form = Form.useFormInstance<PurchaseRequestDraftFormValues>();
  const fundingSource = Form.useWatch('funding_source', form);
  const showIncomeLink = fundingSource === 'income_contract';
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: project.code != null ? `${project.code} — ${project.name}` : project.name,
  }));
  const departmentOptions = departments.map(department => ({
    value: department.id,
    label: department.name,
  }));
  const fundingOptions = FUNDING_SOURCES.map(source => ({
    value: source,
    label: FUNDING_SOURCE_LABELS[source],
  }));
  const off = (name: string) => isFieldDisabled(writable, name, disabled);

  return (
    <>
      <Divider orientation='left'>
        <ShoppingOutlined /> Что закупаем
      </Divider>

      <Row gutter={16}>
        <Col span={24}>
          <Form.Item
            label='Предмет закупки'
            name='subject'
            rules={[{ required: true, whitespace: true, message: 'Укажите предмет' }]}
          >
            <Input maxLength={2000} placeholder='Что нужно закупить' disabled={off('subject')} />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label='Обоснование'
            name='justification'
            rules={[{ required: true, whitespace: true, message: 'Укажите обоснование' }]}
          >
            <TextArea rows={3} maxLength={2000} placeholder='Зачем нужна закупка' disabled={off('justification')} />
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation='left'>
        <CalendarOutlined /> Срок и сумма
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Form.Item
            label='Требуемый срок поставки'
            name='required_date'
            rules={[{ required: true, message: 'Укажите срок' }]}
          >
            <DatePicker format='DD.MM.YYYY' disabled={off('required_date')} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label='Сумма'
            name='amount'
            rules={[{ type: 'number', max: MONEY_NUMERIC_MAX, message: 'Слишком большая сумма' }]}
          >
            <InputNumber
              {...MONEY_INPUT_NUMBER_PROPS}
              max={MONEY_NUMERIC_MAX}
              disabled={off('amount')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item label='Приоритет' name='is_urgent' valuePropName='checked' className={styles.urgentItem}>
            <Checkbox disabled={off('is_urgent')}>Срочный запрос</Checkbox>
          </Form.Item>
        </Col>
      </Row>

      <Divider orientation='left'>
        <ProjectOutlined /> Проект и ответственные
      </Divider>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item label='Проект' name='project_id' rules={[{ required: true, message: 'Выберите проект' }]}>
            <Select
              showSearch
              optionFilterProp='label'
              loading={projectsLoading}
              options={projectOptions}
              placeholder='Проект'
              disabled={off('project_id')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label='Подразделение'
            name='department_id'
            rules={[{ required: true, message: 'Выберите подразделение' }]}
            extra={departmentPrefillHint ? 'Подставляется ваше подразделение, можно сменить' : undefined}
          >
            <Select
              showSearch
              optionFilterProp='label'
              loading={departmentsLoading}
              options={departmentOptions}
              placeholder='Подразделение'
              disabled={off('department_id')}
            />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label='Технический приемщик'
            name='tech_acceptor_id'
            rules={[{ required: true, message: 'Выберите приемщика' }]}
          >
            <EmployeeSelect placeholder='Сотрудник' disabled={off('tech_acceptor_id')} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item label='Источник финансирования' name='funding_source'>
            <Select
              options={fundingOptions}
              placeholder='Источник финансирования'
              allowClear
              disabled={off('funding_source')}
            />
          </Form.Item>
        </Col>
        {showIncomeLink ? (
          <IncomeContractStageFields
            wrapInColumns
            contracts={incomeContracts}
            contractsLoading={contractsLoading}
            disabled={off('income_contract_id')}
            onContractChange={(_id, contract) => {
              if (contract?.project_id) {
                form.setFieldValue('project_id', contract.project_id);
              }
            }}
          />
        ) : null}
      </Row>
    </>
  );
}
