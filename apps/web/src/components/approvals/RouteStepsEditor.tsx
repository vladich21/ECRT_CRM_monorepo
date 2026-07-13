import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Input, InputNumber, Row, Select, Space, Switch, Typography } from 'antd';

import { genId } from '@/helpers/uuid';
import type {
  ApprovalAssignmentType,
  ApprovalStepRoleRef,
  ApprovalStepType,
  RouteStepFormValue,
} from '@/types/approval';

import { EmployeeSelect } from './EmployeeSelect';

const STEP_TYPE_OPTIONS: { value: ApprovalStepType; label: string }[] = [
  { value: 'any', label: 'Достаточно одного' },
  { value: 'all', label: 'Нужны все' },
  { value: 'sequential', label: 'По очереди' },
];

const ASSIGNMENT_OPTIONS: { value: ApprovalAssignmentType; label: string }[] = [
  { value: 'employee', label: 'Выбранные сотрудники' },
  { value: 'initiator_head', label: 'Руководитель инициатора' },
  { value: 'document_owner', label: 'Владелец документа' },
  { value: 'select_on_start', label: 'Укажет инициатор при запуске' },
];

interface RouteStepsEditorProps {
  value: RouteStepFormValue[];
  onChange: (steps: RouteStepFormValue[]) => void;
  stepRoles: ApprovalStepRoleRef[];
}

function newStep(): RouteStepFormValue {
  return {
    key: genId(),
    name: '',
    step_type: 'all',
    assignment_type: 'employee',
    assignee_ids: [],
    is_required: true,
    can_delegate: false,
    can_return_to_previous: true,
  };
}

export function RouteStepsEditor({ value, onChange, stepRoles }: RouteStepsEditorProps) {
  const patch = (index: number, changes: Partial<RouteStepFormValue>) => {
    onChange(value.map((s, i) => (i === index ? { ...s, ...changes } : s)));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, newStep()]);

  const roleOptions = stepRoles.map((r) => ({ value: r.id, label: r.name }));

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {value.length === 0 && <Typography.Text type="secondary">Добавьте хотя бы один шаг маршрута.</Typography.Text>}

      {value.map((step, index) => (
        <Card
          key={step.key}
          size="small"
          title={`Шаг ${index + 1}`}
          extra={
            <Space>
              <Button size="small" icon={<ArrowUpOutlined />} disabled={index === 0} onClick={() => move(index, -1)} />
              <Button
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              />
              <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />
            </Space>
          }
        >
          <Row gutter={[12, 12]}>
            <Col span={12}>
              <Typography.Text type="secondary">Название шага</Typography.Text>
              <Input
                value={step.name}
                onChange={(e) => patch(index, { name: e.target.value })}
                placeholder="Например, Согласование руководителем"
              />
            </Col>
            <Col span={12}>
              <Typography.Text type="secondary">Роль шага</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={step.step_role_id}
                onChange={(v) => patch(index, { step_role_id: v })}
                options={roleOptions}
                placeholder="Роль"
                allowClear
              />
            </Col>

            <Col span={12}>
              <Typography.Text type="secondary">Тип согласования</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={step.step_type}
                onChange={(v) => patch(index, { step_type: v })}
                options={STEP_TYPE_OPTIONS}
              />
            </Col>
            <Col span={12}>
              <Typography.Text type="secondary">Кто согласует</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={step.assignment_type}
                onChange={(v) => patch(index, { assignment_type: v, assignee_ids: v === 'employee' ? step.assignee_ids ?? [] : [] })}
                options={ASSIGNMENT_OPTIONS}
              />
            </Col>

            {step.assignment_type === 'employee' && (
              <Col span={24}>
                <Typography.Text type="secondary">Согласующие (порядок важен для «По очереди»)</Typography.Text>
                <EmployeeSelect
                  multiple
                  ordered
                  value={step.assignee_ids}
                  onChange={(v) => patch(index, { assignee_ids: v as string[] })}
                  placeholder="Выберите сотрудников"
                />
              </Col>
            )}

            <Col span={8}>
              <Typography.Text type="secondary">Срок (часов)</Typography.Text>
              <InputNumber
                style={{ width: '100%' }}
                min={1}
                value={step.time_limit_hours ?? undefined}
                onChange={(v) => patch(index, { time_limit_hours: v ?? null })}
                placeholder="нет SLA"
              />
            </Col>
            <Col span={8}>
              <Space>
                <Switch checked={step.is_required !== false} onChange={(v) => patch(index, { is_required: v })} />
                <span>Обязательный шаг</span>
              </Space>
            </Col>
            <Col span={8}>
              <Space>
                <Switch checked={step.can_delegate} onChange={(v) => patch(index, { can_delegate: v })} />
                <span>Делегирование</span>
              </Space>
            </Col>
            <Col span={8}>
              <Space>
                <Switch
                  checked={step.can_return_to_previous}
                  onChange={(v) => patch(index, { can_return_to_previous: v })}
                />
                <span>Возврат на шаг</span>
              </Space>
            </Col>
          </Row>
        </Card>
      ))}

      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Добавить шаг
      </Button>
    </Space>
  );
}
