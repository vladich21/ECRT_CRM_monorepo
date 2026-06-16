import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Col, Input, InputNumber, Row, Select, Space, Typography } from 'antd';

import type { PostApprovalActionForm } from '@/types/approval';

import { EmployeeSelect } from './EmployeeSelect';

const ASSIGNEE_TYPE_OPTIONS = [
  { value: 'initiator', label: 'Инициатор' },
  { value: 'document_owner', label: 'Владелец документа' },
  { value: 'initiator_head', label: 'Руководитель инициатора' },
  { value: 'specific_employee', label: 'Конкретный сотрудник' },
  { value: 'select_on_start', label: 'Укажет инициатор при запуске' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
  { value: 'urgent', label: 'Срочный' },
];

interface RouteActionsEditorProps {
  value: PostApprovalActionForm[];
  onChange: (actions: PostApprovalActionForm[]) => void;
}

function newAction(): PostApprovalActionForm {
  return {
    id: crypto.randomUUID(),
    action_type: 'create_task',
    task_config: { title_template: '', assignee_type: 'initiator', due_days: 5, priority: 'normal' },
  };
}

export function RouteActionsEditor({ value, onChange }: RouteActionsEditorProps) {
  const patchConfig = (index: number, changes: Partial<PostApprovalActionForm['task_config']>) => {
    onChange(
      value.map((a, i) => (i === index ? { ...a, task_config: { ...a.task_config, ...changes } } : a)),
    );
  };
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const add = () => onChange([...value, newAction()]);

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Typography.Text type="secondary">
        Задачи создаются автоматически при успешном завершении согласования. Доступны переменные{' '}
        <code>{'{number}'}</code>, <code>{'{title}'}</code>, <code>{'{type}'}</code>.
      </Typography.Text>

      {value.map((action, index) => (
        <Card
          key={action.id}
          size="small"
          title={`Задача ${index + 1}`}
          extra={<Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(index)} />}
        >
          <Row gutter={[12, 12]}>
            <Col span={24}>
              <Typography.Text type="secondary">Название задачи</Typography.Text>
              <Input
                value={action.task_config.title_template}
                onChange={(e) => patchConfig(index, { title_template: e.target.value })}
                placeholder="Например, Регистрация {number}"
              />
            </Col>
            <Col span={24}>
              <Typography.Text type="secondary">Описание</Typography.Text>
              <Input.TextArea
                value={action.task_config.description_template}
                onChange={(e) => patchConfig(index, { description_template: e.target.value })}
                rows={2}
              />
            </Col>
            <Col span={12}>
              <Typography.Text type="secondary">Исполнитель</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={action.task_config.assignee_type}
                onChange={(v) => patchConfig(index, { assignee_type: v, assignee_id: undefined })}
                options={ASSIGNEE_TYPE_OPTIONS}
              />
            </Col>
            {action.task_config.assignee_type === 'specific_employee' && (
              <Col span={12}>
                <Typography.Text type="secondary">Сотрудник</Typography.Text>
                <EmployeeSelect
                  value={action.task_config.assignee_id}
                  onChange={(v) => patchConfig(index, { assignee_id: v as string })}
                />
              </Col>
            )}
            <Col span={12}>
              <Typography.Text type="secondary">Срок (дней)</Typography.Text>
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                value={action.task_config.due_days}
                onChange={(v) => patchConfig(index, { due_days: v ?? 0 })}
              />
            </Col>
            <Col span={12}>
              <Typography.Text type="secondary">Приоритет</Typography.Text>
              <Select
                style={{ width: '100%' }}
                value={action.task_config.priority}
                onChange={(v) => patchConfig(index, { priority: v })}
                options={PRIORITY_OPTIONS}
              />
            </Col>
          </Row>
        </Card>
      ))}

      <Button type="dashed" icon={<PlusOutlined />} onClick={add} block>
        Добавить задачу
      </Button>
    </Space>
  );
}
