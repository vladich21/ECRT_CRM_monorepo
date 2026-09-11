import { ArrowDownOutlined, ArrowUpOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Input, InputNumber, Select, Switch, Typography } from 'antd';

import { genId } from '@/helpers/uuid';
import type {
  ApprovalAssignmentType,
  ApprovalStepRoleRef,
  ApprovalStepType,
  RouteStepFormValue,
} from '@/types/approval';

import { EmployeeSelect } from './EmployeeSelect';

import styles from '@/pages/approvals/routes/ApprovalRouteFormPage.module.scss';

const STEP_TYPE_OPTIONS: { value: ApprovalStepType; label: string }[] = [
  { value: 'any', label: 'Достаточно одного' },
  { value: 'all', label: 'Нужны все' },
  { value: 'sequential', label: 'По очереди' },
];

const ASSIGNMENT_OPTIONS: { value: ApprovalAssignmentType; label: string }[] = [
  { value: 'employee', label: 'Выбранные сотрудники' },
  { value: 'initiator_head', label: 'Руководитель инициатора' },
  { value: 'document_owner', label: 'Владелец документа' },
  { value: 'owner_or_head', label: 'Владелец или руководитель инициатора' },
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

  const roleOptions = stepRoles.map(r => ({ value: r.id, label: r.name }));

  return (
    <div className={styles.steps}>
      {value.length === 0 ? (
        <Typography.Text className={styles.empty}>Добавьте хотя бы один шаг маршрута.</Typography.Text>
      ) : null}

      <div className={styles.stepsGrid}>
        {value.map((step, index) => (
          <div key={step.key} className={styles.stepCard}>
            <div className={styles.stepHead}>
              <span className={styles.stepHeadLabel}>Шаг {index + 1}</span>
              <div>
                <Button
                  type='text'
                  size='small'
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  title='Выше'
                />
                <Button
                  type='text'
                  size='small'
                  icon={<ArrowDownOutlined />}
                  disabled={index === value.length - 1}
                  onClick={() => move(index, 1)}
                  title='Ниже'
                />
                <Button
                  type='text'
                  size='small'
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => remove(index)}
                  title='Удалить'
                />
              </div>
            </div>

            <div className={styles.stepBody}>
              <div className={styles.fieldRow}>
                <div className={`${styles.field} ${styles.fieldName}`}>
                  <span className={styles.fieldLabel}>Название</span>
                  <Input
                    value={step.name}
                    onChange={e => patch(index, { name: e.target.value })}
                    placeholder='Согласование руководителем'
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldRole}`}>
                  <span className={styles.fieldLabel}>Роль</span>
                  <Select
                    style={{ width: '100%' }}
                    value={step.step_role_id}
                    onChange={v => patch(index, { step_role_id: v })}
                    options={roleOptions}
                    placeholder='Роль'
                    allowClear
                  />
                </div>
              </div>

              <div className={styles.fieldRow}>
                <div className={`${styles.field} ${styles.fieldWho}`}>
                  <span className={styles.fieldLabel}>Кто согласует</span>
                  <Select
                    style={{ width: '100%' }}
                    value={step.assignment_type}
                    onChange={v =>
                      patch(index, {
                        assignment_type: v,
                        assignee_ids: v === 'employee' ? (step.assignee_ids ?? []) : [],
                      })
                    }
                    options={ASSIGNMENT_OPTIONS}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldType}`}>
                  <span className={styles.fieldLabel}>Тип</span>
                  <Select
                    style={{ width: '100%' }}
                    value={step.step_type}
                    onChange={v => patch(index, { step_type: v })}
                    options={STEP_TYPE_OPTIONS}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldSla}`}>
                  <span className={styles.fieldLabel}>Срок, ч</span>
                  <InputNumber
                    style={{ width: '100%' }}
                    min={1}
                    value={step.time_limit_hours ?? undefined}
                    onChange={v => patch(index, { time_limit_hours: v ?? null })}
                    placeholder='нет'
                  />
                </div>
              </div>

              {step.assignment_type === 'employee' ? (
                <div className={`${styles.field} ${styles.fieldAssignees}`}>
                  <span className={styles.fieldLabel}>
                    Согласующие{step.step_type === 'sequential' ? ' (порядок важен)' : ''}
                  </span>
                  <EmployeeSelect
                    multiple
                    ordered
                    value={step.assignee_ids}
                    onChange={v => patch(index, { assignee_ids: v as string[] })}
                    placeholder='Выберите сотрудников'
                  />
                </div>
              ) : null}

              <div className={styles.flagsRow}>
                <label className={styles.flagItem}>
                  <Switch
                    checked={step.is_required !== false}
                    onChange={v => patch(index, { is_required: v })}
                  />
                  Обязательный
                </label>
                <label className={styles.flagItem}>
                  <Switch checked={!!step.can_delegate} onChange={v => patch(index, { can_delegate: v })} />
                  Делегирование
                </label>
                <label className={styles.flagItem}>
                  <Switch
                    checked={step.can_return_to_previous !== false}
                    onChange={v => patch(index, { can_return_to_previous: v })}
                  />
                  Возврат на шаг
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type='dashed' icon={<PlusOutlined />} onClick={add} className={styles.addBtn}>
        Добавить шаг
      </Button>
    </div>
  );
}
